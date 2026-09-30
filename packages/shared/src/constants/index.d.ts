export declare enum TableStatus {
    AVAILABLE = "available",
    OCCUPIED = "occupied"
}
export declare enum SessionStatus {
    ACTIVE = "active",
    EXPIRED = "expired",
    CLOSED = "closed"
}
export declare enum OrderStatus {
    PLACED = "placed",
    ACCEPTED = "accepted",
    PREPARING = "preparing",
    READY = "ready",
    SERVED = "served",
    BILLED = "billed",
    CANCELLED = "cancelled",
    CANCELLATION_REQUESTED = "cancellation_requested"
}
export declare enum PaymentStatus {
    PENDING = "pending",
    ADVANCE_PAID = "advance_paid",
    PAID = "paid",
    REFUND_PENDING = "refund_pending",
    REFUNDED = "refunded"
}
export declare enum PaymentMethod {
    CASH = "cash",
    RAZORPAY = "razorpay",
    ONLINE = "online"
}
export declare enum AdminRole {
    ADMIN = "admin",
    KITCHEN = "kitchen",
    CASHIER = "cashier"
}
export declare const SOCKET_EVENTS: {
    readonly TABLE_STATUS_CHANGED: "table:status_changed";
    readonly ORDER_STATUS_CHANGED: "order:status_changed";
    readonly ORDER_NEW: "order:new";
    readonly ORDER_UPDATED: "order:updated";
    readonly SESSION_EXPIRING_SOON: "session:expiring_soon";
};
export declare const GST_RATE = 0.05;
export declare const SESSION_TTL_MS: number;
export declare const EXPIRY_WARNING_THRESHOLD_MS: number;
