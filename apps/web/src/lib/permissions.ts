/**
 * Local permissions module — avoids Webpack circular-import issues
 * that occur when importing from @chai-partner/shared in client components.
 *
 * Keep in sync with packages/shared/src/constants/permissions.ts
 */

export const AdminRole = {
  ADMIN: 'admin',
  KITCHEN: 'kitchen',
  CASHIER: 'cashier',
} as const;

export type AdminRole = (typeof AdminRole)[keyof typeof AdminRole];

export type Permission =
  | 'orders.view'
  | 'orders.cook'
  | 'orders.settle'
  | 'orders.cancel'
  | 'orders.history'
  | 'menu.view'
  | 'menu.manage'
  | 'analytics.view'
  | 'staff.manage'
  | 'staff.roles'
  | 'tables.manage';

export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  [AdminRole.ADMIN]: [
    'orders.view',
    'orders.cook',
    'orders.settle',
    'orders.cancel',
    'orders.history',
    'menu.view',
    'menu.manage',
    'analytics.view',
    'staff.manage',
    'staff.roles',
    'tables.manage',
  ],
  [AdminRole.KITCHEN]: [
    'orders.view',
    'orders.cook',
    'orders.history',
    'menu.view',
  ],
  [AdminRole.CASHIER]: [
    'orders.view',
    'orders.settle',
    'orders.history',
    'menu.view',
    'tables.manage',
  ],
};

export function hasPermission(
  role: string | undefined | null,
  permission: Permission,
): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role as AdminRole];
  if (!permissions) return false;
  return permissions.includes(permission);
}

export interface RoleMeta {
  role: AdminRole;
  label: string;
  shortLabel: string;
  badge: string;
  description: string;
  scope: string;
}

export const ROLE_CONFIGS: Record<AdminRole, RoleMeta> = {
  [AdminRole.ADMIN]: {
    role: AdminRole.ADMIN,
    label: 'Owner / Admin',
    shortLabel: 'Admin',
    badge: 'Owner / Admin',
    description: 'Full administrative access: orders, menu, finances, analytics, and staff management.',
    scope: 'Full Café Operations & Management',
  },
  [AdminRole.KITCHEN]: {
    role: AdminRole.KITCHEN,
    label: 'Head Chef',
    shortLabel: 'Chef',
    badge: 'Head Chef',
    description: 'Kitchen ticket queue, cooking flow, preparation updates, and stock availability.',
    scope: 'Kitchen Operations & Preparation',
  },
  [AdminRole.CASHIER]: {
    role: AdminRole.CASHIER,
    label: 'Cashier / POS',
    shortLabel: 'Cashier',
    badge: 'Cashier POS',
    description: 'Table orders, counter billing, cash/UPI payment settlements, and order history.',
    scope: 'POS Operations & Settlements',
  },
};
