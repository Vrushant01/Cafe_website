import { OrderStatus, PaymentMethod, PaymentStatus, TableStatus } from '../constants';

export interface ResolveTableResponse {
  table: {
    id: string;
    table_number: number;
    seat_count: number;
    status: TableStatus;
  };
  all_tables: Array<{
    id: string;
    table_number: number;
    seat_count: number;
    status: TableStatus;
  }>;
  active_session?: {
    id: string;
    customer_name: string;
    expires_at: string;
  } | null;
}

export interface RequestOtpDto {
  table_id: string;
  phone: string;
  name: string;
  email?: string;
}

export interface VerifyOtpDto {
  table_id: string;
  phone: string;
  otp: string;
  name: string;
  email?: string;
}

export interface VerifyOtpResponse {
  session_token: string;
  session: {
    id: string;
    table_id: string;
    customer_name: string;
    phone_masked: string;
    expires_at: string;
    status: string;
  };
  table: {
    id: string;
    table_number: number;
    seat_count: number;
    status: string;
  };
}

export interface CreateOrderItemInput {
  menu_item_id: string;
  qty: number;
}

export interface CreateOrderDto {
  items: CreateOrderItemInput[];
  payment_method: PaymentMethod;
  notes?: string;
}

export interface UpdateOrderStatusDto {
  expected_status: OrderStatus;
  new_status: OrderStatus;
}

export interface SettleOrderDto {
  payment_method: PaymentMethod;
}

export interface ForceVacateDto {
  reason: string;
}

export interface ContactManagerAlertDto {
  table_number: number;
  message?: string;
}

export interface AdminLoginDto {
  email: string;
  password: string;
}
