import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore';
import { auth, db, firebaseConfig } from '@/firebase/config';
import type { AppUser, UserFormData } from '@/types';
import { toDate } from '@/utils';

const USERS = 'users';

function mapUser(id: string, data: DocumentData): AppUser {
  return {
    id,
    uid: data.uid ?? id,
    email: data.email ?? '',
    name: data.name ?? '',
    phone: data.phone || undefined,
    notes: data.notes || undefined,
    role: data.role === 'admin' ? 'admin' : 'user',
    isDeleted: Boolean(data.isDeleted),
    createdAt: toDate(data.createdAt) ?? new Date(),
    createdBy: data.createdBy ?? '',
    updatedAt: toDate(data.updatedAt) ?? new Date(),
    updatedBy: data.updatedBy ?? '',
    deletedAt: toDate(data.deletedAt),
    deletedBy: data.deletedBy || undefined,
  };
}

export async function fetchUsers(includeDeleted = false): Promise<AppUser[]> {
  const snapshot = await getDocs(query(collection(db, USERS), orderBy('name', 'asc')));
  const users = snapshot.docs.map((docSnap) => mapUser(docSnap.id, docSnap.data()));
  return includeDeleted ? users : users.filter((user) => !user.isDeleted);
}

export async function fetchUserById(id: string): Promise<AppUser | null> {
  const docSnap = await getDoc(doc(db, USERS, id));
  if (!docSnap.exists()) return null;
  return mapUser(docSnap.id, docSnap.data());
}

export async function ensureUserProfile(authUser: FirebaseUser): Promise<void> {
  const ref = doc(db, USERS, authUser.uid);
  const snap = await getDoc(ref);
  const now = Timestamp.now();
  const email = authUser.email ?? '';

  if (!snap.exists()) {
    const allUsers = await getDocs(collection(db, USERS));
    const hasAdmin = allUsers.docs.some((userDoc) => userDoc.data().role === 'admin');

    await setDoc(ref, {
      uid: authUser.uid,
      email,
      name: authUser.displayName?.trim() || '',
      phone: null,
      notes: null,
      role: hasAdmin ? 'user' : 'admin',
      isDeleted: false,
      createdAt: now,
      createdBy: email || 'system',
      updatedAt: now,
      updatedBy: email || 'system',
      deletedAt: null,
      deletedBy: null,
    });
    return;
  }

  const data = snap.data();
  if (data.isDeleted) return;

  if (data.email !== email) {
    await updateDoc(ref, {
      email,
      updatedAt: now,
      updatedBy: email || 'system',
    });
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

export async function createUser(data: UserFormData, actorEmail: string): Promise<string> {
  const now = Timestamp.now();
  let uid = data.uid?.trim() ?? '';

  if (data.linkExisting) {
    if (!uid) throw new Error('UID is required when linking an existing Auth user');
    const existing = await getDoc(doc(db, USERS, uid));
    if (existing.exists() && !existing.data().isDeleted) {
      throw new Error('A profile already exists for this UID');
    }
  } else {
    if (!data.password || data.password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    uid = await createAuthAccount(data.email.trim(), data.password);
  }

  await setDoc(doc(db, USERS, uid), {
    uid,
    email: data.email.trim(),
    name: data.name.trim(),
    phone: data.phone?.trim() || null,
    notes: data.notes?.trim() || null,
    role: data.role === 'admin' ? 'admin' : 'user',
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
  data: Pick<UserFormData, 'name' | 'phone' | 'notes' | 'email' | 'role'>,
  actorEmail: string,
): Promise<void> {
  await updateDoc(doc(db, USERS, id), {
    email: data.email.trim(),
    name: data.name.trim(),
    phone: data.phone?.trim() || null,
    notes: data.notes?.trim() || null,
    ...(data.role ? { role: data.role } : {}),
    updatedAt: Timestamp.now(),
    updatedBy: actorEmail,
  });
}

export async function softDeleteUser(id: string, actorEmail: string): Promise<void> {
  if (auth.currentUser?.uid === id) {
    throw new Error('You cannot delete your own account from here');
  }

  await updateDoc(doc(db, USERS, id), {
    isDeleted: true,
    deletedAt: Timestamp.now(),
    deletedBy: actorEmail,
    updatedAt: Timestamp.now(),
    updatedBy: actorEmail,
  });
}

export async function restoreUser(id: string, actorEmail: string): Promise<void> {
  await updateDoc(doc(db, USERS, id), {
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    updatedAt: Timestamp.now(),
    updatedBy: actorEmail,
  });
}
