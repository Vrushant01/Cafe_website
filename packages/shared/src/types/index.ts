import {
  TableStatus,
  SessionStatus,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  AdminRole,
} from '../constants';

export interface ITable {
  id: string;
  table_number: number;
  seat_count: number;
  status: TableStatus;
  current_session_id?: string | null;
  qr_token: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface ISession {
  id: string;
  table_id: string;
  customer_name: string;
  phone: string; // Encrypted in DB, masked in responses
  email?: string | null;
  otp_verified_at?: Date | null;
  started_at: Date;
  expires_at: Date;
  status: SessionStatus;
  created_at?: Date;
  updated_at?: Date;
  table?: ITable;
}

export interface IMenuCategory {
  id: string;
  name: string;
  sort_order: number;
  created_at?: Date;
  updated_at?: Date;
  items?: IMenuItem[];
}

export interface IMenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string | null;
  is_bestseller: boolean;
  is_available: boolean;
  veg_flag: boolean;
  created_at?: Date;
  updated_at?: Date;
  category?: IMenuCategory;
}

export interface IOrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  qty: number;
  unit_price: number; // Snapshot, immutable
  item_name?: string;
  veg_flag?: boolean;
}

export interface IOrder {
  id: string;
  session_id: string;
  table_id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string | null;
  created_at: Date;
  updated_at: Date;
  items: IOrderItem[];
  table?: ITable;
  session?: ISession;
}

export interface IPayment {
  id: string;
  order_id: string;
  method: PaymentMethod;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  amount: number;
  status: PaymentStatus;
  created_at: Date;
  updated_at: Date;
}

export interface IRefund {
  id: string;
  payment_id: string;
  amount: number;
  reason: string;
  processed_by: string;
  timestamp: Date;
}

export interface IAdminUser {
  id: string;
  name: string;
  role: AdminRole;
  phone?: string | null;
  email: string;
  password_hash?: string;
  created_at: Date;
}

export interface IAuditLog {
  id: string;
  actor_id: string;
  actor_type: 'admin' | 'system' | 'customer';
  action: string;
  entity: string;
  entity_id: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface IIdempotencyKey {
  id: string;
  session_id: string;
  key: string;
  response_snapshot: any;
  created_at: Date;
}
