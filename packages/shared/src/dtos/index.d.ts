import { OrderStatus, PaymentMethod, TableStatus } from '../constants';
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
export interface CreateMenuItemDto {
    category_id: string;
    name: string;
    description?: string;
    price: number;
    image_url?: string;
    is_bestseller?: boolean;
    is_available?: boolean;
    veg_flag?: boolean;
}
export interface UpdateMenuItemDto {
    category_id?: string;
    name?: string;
    description?: string;
    price?: number;
    image_url?: string;
    is_bestseller?: boolean;
    is_available?: boolean;
    veg_flag?: boolean;
}
export interface OrderHistoryFilterDto {
    search?: string;
    range?: 'day' | 'week' | 'month' | 'year' | 'all';
    status?: OrderStatus;
    payment_method?: PaymentMethod;
    page?: number;
    limit?: number;
}
export interface ProcessRefundDto {
    amount: number;
    reason: string;
}
export interface AnalyticsQueryDto {
    range?: 'day' | 'week' | 'month' | 'year' | 'all';
}
