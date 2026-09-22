import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  collection,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import {
  assertCanAssignAccess,
  assertCanManageUser,
  defaultPermissions,
  emptyPermissions,
  fullPermissions,
  normalizePermissions,
  normalizeRole,
  PERMISSION_KEYS,
} from '@/auth/access';
import { auth, db, firebaseConfig } from '@/firebase/config';
import type { AppUser, UserFormData, UserRole } from '@/types';
import { toDate } from '@/utils';

const USERS = 'users';
const META = 'meta';
const INITIALIZED = 'initialized';

function mapUser(id: string, data: DocumentData): AppUser {
  const role = normalizeRole(data.role);
  const hasLogin =
    typeof data.hasLogin === 'boolean' ? data.hasLogin : Boolean(String(data.email ?? '').trim());
  return {
    id,
    uid: data.uid ?? id,
    email: data.email ?? '',
    name: data.name ?? '',
    phone: data.phone || undefined,
    notes: data.notes || undefined,
    role,
    permissions: hasLogin ? normalizePermissions(role, data.permissions) : emptyPermissions(),
    hasLogin,
    isDeleted: Boolean(data.isDeleted),
    createdAt: toDate(data.createdAt) ?? new Date(),
    createdBy: data.createdBy ?? '',
    updatedAt: toDate(data.updatedAt) ?? new Date(),
    updatedBy: data.updatedBy ?? '',
    deletedAt: toDate(data.deletedAt),
    deletedBy: data.deletedBy || undefined,
  };
}

function needsAccessMigration(data: DocumentData): boolean {
  const role = data.role;
  if (role === 'admin' || role === 'user' || role == null) return true;
  if (role !== 'super_admin' && role !== 'manager' && role !== 'field_staff') return true;
  if (!data.permissions || typeof data.permissions !== 'object') return true;
  if (role === 'super_admin') {
    return PERMISSION_KEYS.some((key) => data.permissions[key] !== true);
  }
  return false;
}

function accessForRole(role: UserRole) {
  return role === 'super_admin' ? fullPermissions() : defaultPermissions(role);
}

async function ensureInitializedMarker(uid: string): Promise<void> {
  await setDoc(
    doc(db, META, INITIALIZED),
    { uid, updatedAt: Timestamp.now() },
    { merge: true },
  );
}

export async function fetchUsers(includeDeleted = false): Promise<AppUser[]> {
  const snapshot = await getDocs(query(collection(db, USERS), orderBy('name', 'asc')));
  const users = snapshot.docs.map((docSnap) => mapUser(docSnap.id, docSnap.data()));
  return includeDeleted ? users : users.filter((user) => !user.isDeleted);
}

export async function fetchManagers(): Promise<AppUser[]> {
  const snapshot = await getDocs(query(collection(db, USERS), where('role', '==', 'manager')));
  return snapshot.docs
    .map((docSnap) => mapUser(docSnap.id, docSnap.data()))
    .filter((user) => !user.isDeleted)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchActiveUsers(): Promise<AppUser[]> {
  const snapshot = await getDocs(query(collection(db, USERS), where('isDeleted', '==', false)));
  return snapshot.docs
    .map((docSnap) => mapUser(docSnap.id, docSnap.data()))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchUserById(id: string): Promise<AppUser | null> {
  const docSnap = await getDoc(doc(db, USERS, id));
  if (!docSnap.exists()) return null;
  return mapUser(docSnap.id, docSnap.data());
}

export function subscribeToUser(
  id: string,
  onData: (user: AppUser | null) => void,
): () => void {
  return onSnapshot(doc(db, USERS, id), (snap) => {
    onData(snap.exists() ? mapUser(snap.id, snap.data()) : null);
  });
}

export async function ensureUserProfile(authUser: FirebaseUser): Promise<void> {
  const ref = doc(db, USERS, authUser.uid);
  const snap = await getDoc(ref);
  const now = Timestamp.now();
  const email = authUser.email ?? '';

  if (!snap.exists()) {
    const marker = await getDoc(doc(db, META, INITIALIZED));
    const isFirstAccount = !marker.exists();
    const role: UserRole = isFirstAccount ? 'super_admin' : 'field_staff';
    const profile = {
      uid: authUser.uid,
      email,
      name: authUser.displayName?.trim() || '',
      phone: null,
      notes: null,
      role,
      permissions: accessForRole(role),
      hasLogin: true,
      isDeleted: false,
      createdAt: now,
      createdBy: email || 'system',
      updatedAt: now,
      updatedBy: email || 'system',
      deletedAt: null,
      deletedBy: null,
    };

    if (isFirstAccount) {
      const batch = writeBatch(db);
      batch.set(ref, profile);
      batch.set(doc(db, META, INITIALIZED), { uid: authUser.uid, updatedAt: now });
      await batch.commit();
      return;
    }

    await setDoc(ref, profile);
    return;
  }

  const data = snap.data();
  if (data.isDeleted) return;

  const role = normalizeRole(data.role);
  const migrating = needsAccessMigration(data);
  const emailChanged = data.email !== email;

  if (migrating || emailChanged) {
    await updateDoc(ref, {
      ...(emailChanged ? { email } : {}),
      ...(migrating ? { role, permissions: accessForRole(role) } : {}),
      updatedAt: now,
      updatedBy: email || 'system',
    });
  }

  if (role === 'super_admin') {
    await ensureInitializedMarker(authUser.uid);
  }
}

async function createAuthAccount(email: string, password: string): Promise<string> {
  let secondaryApp: FirebaseApp | undefined;

  try {
    secondaryApp = initializeApp(firebaseConfig, `Secondary_${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    return credential.user.uid;
  } finally {
    if (secondaryApp) await deleteApp(secondaryApp);
  }
}

async function requireActor(): Promise<AppUser> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('You must be logged in.');
  const actor = await fetchUserById(uid);
  if (!actor || actor.isDeleted) throw new Error('You must be logged in.');
  return actor;
}

export async function createUser(data: UserFormData, actorEmail: string): Promise<string> {
  const actor = await requireActor();
  const noLogin = Boolean(data.noLogin);
  const role = noLogin ? 'field_staff' : normalizeRole(data.role);
  const permissions = noLogin
    ? emptyPermissions()
    : normalizePermissions(role, data.permissions);
  assertCanAssignAccess(actor, role, permissions);

  if (noLogin && role !== 'field_staff') {
    throw new Error('Users without login must be field staff.');
  }

  const now = Timestamp.now();
  let uid = data.uid?.trim() ?? '';

  if (noLogin) {
    uid = doc(collection(db, USERS)).id;
  } else if (data.linkExisting) {
    if (!uid) throw new Error('UID is required when linking an existing Auth user');
    const existing = await getDoc(doc(db, USERS, uid));
    if (existing.exists() && !existing.data().isDeleted) {
      throw new Error('A profile already exists for this UID');
    }
  } else {
    if (!data.email.trim()) throw new Error('Email is required for login users');
    if (!data.password || data.password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    uid = await createAuthAccount(data.email.trim(), data.password);
  }

  await setDoc(doc(db, USERS, uid), {
    uid,
    email: noLogin ? null : data.email.trim(),
    name: data.name.trim(),
    phone: data.phone?.trim() || null,
    notes: data.notes?.trim() || null,
    role,
    permissions,
    hasLogin: !noLogin,
    isDeleted: false,
    createdAt: now,
    createdBy: actorEmail,
    updatedAt: now,
    updatedBy: actorEmail,
    deletedAt: null,
    deletedBy: null,
  });

  return uid;
}

export async function updateUser(
  id: string,
  data: Pick<UserFormData, 'name' | 'phone' | 'notes' | 'email' | 'role' | 'permissions' | 'noLogin'>,
  actorEmail: string,
): Promise<void> {
  const actor = await requireActor();
  const existing = await fetchUserById(id);
  if (!existing) throw new Error('User not found');
  assertCanManageUser(actor, existing);

  const editingSelf = actor.uid === id;
  const noLogin = existing.hasLogin ? false : true;
  const role = noLogin
    ? 'field_staff'
    : editingSelf
      ? existing.role
      : normalizeRole(data.role);
  const permissions = noLogin
    ? emptyPermissions()
    : editingSelf
      ? existing.permissions
      : normalizePermissions(role, data.permissions);

  if (!editingSelf && !noLogin) {
    assertCanAssignAccess(actor, role, permissions, existing.permissions);
  }

  await updateDoc(doc(db, USERS, id), {
    email: noLogin ? null : data.email.trim(),
    name: data.name.trim(),
    phone: data.phone?.trim() || null,
    notes: data.notes?.trim() || null,
    role,
    permissions,
    hasLogin: !noLogin,
    updatedAt: Timestamp.now(),
    updatedBy: actorEmail,
  });
}

export async function softDeleteUser(id: string, actorEmail: string): Promise<void> {
  const actor = await requireActor();
  if (actor.uid === id) {
    throw new Error('You cannot delete your own account from here');
  }

  const existing = await fetchUserById(id);
  if (!existing) throw new Error('User not found');
  assertCanManageUser(actor, existing);

  await updateDoc(doc(db, USERS, id), {
    isDeleted: true,
    deletedAt: Timestamp.now(),
    deletedBy: actorEmail,
    updatedAt: Timestamp.now(),
    updatedBy: actorEmail,
  });
}

export async function restoreUser(id: string, actorEmail: string): Promise<void> {
  const actor = await requireActor();
  const existing = await fetchUserById(id);
  if (!existing) throw new Error('User not found');
  assertCanManageUser(actor, existing);

  await updateDoc(doc(db, USERS, id), {
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    updatedAt: Timestamp.now(),
    updatedBy: actorEmail,
  });
}
