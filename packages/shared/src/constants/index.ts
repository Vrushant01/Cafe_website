export enum TableStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
}

export enum SessionStatus {
  ACTIVE = 'active',
  EXITED = 'exited',
  EXPIRED = 'expired',
  COMPLETED = 'completed',
  CLOSED = 'closed',
}

export enum OrderStatus {
  PLACED = 'placed',
  ACCEPTED = 'accepted',
  PREPARING = 'preparing',
  READY = 'ready',
  SERVED = 'served',
  BILLED = 'billed',
  CANCELLED = 'cancelled',
  CANCELLATION_REQUESTED = 'cancellation_requested',
}

export enum PaymentStatus {
  PENDING = 'pending',
  ADVANCE_PAID = 'advance_paid',
  PAID = 'paid',
  REFUND_PENDING = 'refund_pending',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

export enum PaymentMethod {
  CASH = 'cash',
  RAZORPAY = 'razorpay',
  ONLINE = 'online',
}



export const SOCKET_EVENTS = {
  TABLE_STATUS_CHANGED: 'table:status_changed',
  ORDER_STATUS_CHANGED: 'order:status_changed',
  ORDER_NEW: 'order:new',
  ORDER_UPDATED: 'order:updated',
  SESSION_EXPIRING_SOON: 'session:expiring_soon',
} as const;

export const GST_RATE = 0.05; // 5% GST
export const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
export const EXPIRY_WARNING_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes prior

export { AdminRole, ROLE_PERMISSIONS, hasPermission, ROLE_CONFIGS } from './permissions';
export type { Permission, RoleMeta } from './permissions';
