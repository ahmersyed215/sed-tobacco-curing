import type { AppUser, Permission, UserPermissions, UserRole } from '@/types';

export const PERMISSION_KEYS = [
  'dashboard',
  'installations',
  'payments',
  'followups',
  'statistics',
  'expenses',
  'inventory',
  'import',
  'users',
] as const satisfies readonly Permission[];

export const PERMISSION_CATALOG: ReadonlyArray<{
  key: Permission;
  label: string;
  description: string;
}> = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    description: 'Current totals, charts, and follow-up alerts',
  },
  {
    key: 'installations',
    label: 'Installations',
    description: 'Installation records',
  },
  {
    key: 'payments',
    label: 'Payments',
    description: 'Payment records',
  },
  {
    key: 'followups',
    label: 'Follow-ups',
    description: 'Follow-up schedule',
  },
  {
    key: 'statistics',
    label: 'Statistics',
    description: 'Statistics and reports',
  },
  {
    key: 'expenses',
    label: 'Expenses',
    description: 'Super admin sees all expenses; other roles see only their own',
  },
  {
    key: 'inventory',
    label: 'Inventory',
    description: 'Shared inventory list',
  },
  {
    key: 'import',
    label: 'Import data',
    description: 'Spreadsheet import',
  },
  {
    key: 'users',
    label: 'Users',
    description: 'Create users and assign access',
  },
];

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  field_staff: 'Field Staff',
};

const PERMISSION_LABELS: Record<Permission, string> = Object.fromEntries(
  PERMISSION_CATALOG.map((item) => [item.key, item.label]),
) as Record<Permission, string>;

export function fullPermissions(): UserPermissions {
  return Object.fromEntries(PERMISSION_KEYS.map((key) => [key, true])) as UserPermissions;
}

export function emptyPermissions(): UserPermissions {
  return Object.fromEntries(PERMISSION_KEYS.map((key) => [key, false])) as UserPermissions;
}

export function defaultPermissions(role: UserRole): UserPermissions {
  if (role === 'super_admin') return fullPermissions();

  if (role === 'manager') {
    return {
      dashboard: true,
      installations: true,
      payments: true,
      followups: true,
      statistics: true,
      expenses: false,
      inventory: false,
      import: false,
      users: false,
    };
  }

  return {
    dashboard: false,
    installations: true,
    payments: true,
    followups: true,
    statistics: false,
    expenses: false,
    inventory: false,
    import: false,
    users: false,
  };
}

export function normalizeRole(role: unknown): UserRole {
  if (role === 'super_admin' || role === 'manager' || role === 'field_staff') return role;
  if (role === 'admin') return 'super_admin';
  return 'field_staff';
}

export function normalizePermissions(role: UserRole, raw: unknown): UserPermissions {
  if (role === 'super_admin') return fullPermissions();
  if (!raw || typeof raw !== 'object') return defaultPermissions(role);

  const source = raw as Record<string, unknown>;
  const permissions = {} as UserPermissions;
  for (const key of PERMISSION_KEYS) {
    permissions[key] = source[key] === true;
  }
  return permissions;
}

export function hasPermission(profile: AppUser | null | undefined, permission: Permission): boolean {
  if (!profile || profile.isDeleted) return false;
  if (profile.role === 'super_admin') return true;
  return profile.permissions[permission] === true;
}

export function accessSummary(user: Pick<AppUser, 'role' | 'permissions' | 'hasLogin'>): string {
  if (!user.hasLogin) return 'No login';
  if (user.role === 'super_admin') return 'Full access';
  const enabled = PERMISSION_CATALOG.filter((item) => user.permissions[item.key]).map(
    (item) => item.label,
  );
  return enabled.length > 0 ? enabled.join(', ') : 'No access';
}

export function assertCanAssignAccess(
  actor: AppUser,
  role: UserRole,
  permissions: UserPermissions,
  previous?: UserPermissions,
): void {
  if (actor.isDeleted) throw new Error('Your account is disabled.');
  if (actor.role !== 'super_admin' && !actor.permissions.users) {
    throw new Error('You do not have permission to manage users.');
  }
  if (role === 'super_admin' && actor.role !== 'super_admin') {
    throw new Error('Only a super admin can assign the super admin role.');
  }
  if (actor.role === 'super_admin') return;

  for (const key of PERMISSION_KEYS) {
    if (permissions[key] && !actor.permissions[key] && !previous?.[key]) {
      throw new Error(`You cannot grant ${PERMISSION_LABELS[key]} access.`);
    }
  }
}

export function assertCanManageUser(actor: AppUser, target: AppUser): void {
  if (actor.isDeleted) throw new Error('Your account is disabled.');
  if (actor.role !== 'super_admin' && !actor.permissions.users) {
    throw new Error('You do not have permission to manage users.');
  }
  if (target.role === 'super_admin' && actor.role !== 'super_admin') {
    throw new Error('Only a super admin can change a super admin.');
  }
}
