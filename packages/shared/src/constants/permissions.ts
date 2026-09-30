export enum AdminRole {
  ADMIN = 'admin',
  KITCHEN = 'kitchen',
  CASHIER = 'cashier',
}

export type Permission =
  | 'orders.view'        // View live queue & order details
  | 'orders.cook'        // Start cooking & mark ready (kitchen status changes)
  | 'orders.settle'      // Billing & payment settlement (cash/UPI)
  | 'orders.cancel'      // Cancel order / void ticket
  | 'orders.history'     // View order history & past bills
  | 'menu.view'          // View menu items
  | 'menu.manage'        // Edit prices, toggle availability, create/delete dishes
  | 'analytics.view'     // View revenue & analytics reports
  | 'staff.manage'       // View staff list, create, edit, deactivate staff
  | 'staff.roles'        // Assign/change staff roles
  | 'tables.manage';     // Force vacate tables

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
  role: AdminRole | string | undefined | null,
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
