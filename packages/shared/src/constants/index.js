"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXPIRY_WARNING_THRESHOLD_MS = exports.SESSION_TTL_MS = exports.GST_RATE = exports.SOCKET_EVENTS = exports.AdminRole = exports.PaymentMethod = exports.PaymentStatus = exports.OrderStatus = exports.SessionStatus = exports.TableStatus = void 0;
var TableStatus;
(function (TableStatus) {
    TableStatus["AVAILABLE"] = "available";
    TableStatus["OCCUPIED"] = "occupied";
})(TableStatus || (exports.TableStatus = TableStatus = {}));
var SessionStatus;
(function (SessionStatus) {
    SessionStatus["ACTIVE"] = "active";
    SessionStatus["EXPIRED"] = "expired";
    SessionStatus["CLOSED"] = "closed";
})(SessionStatus || (exports.SessionStatus = SessionStatus = {}));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PLACED"] = "placed";
    OrderStatus["ACCEPTED"] = "accepted";
    OrderStatus["PREPARING"] = "preparing";
    OrderStatus["READY"] = "ready";
    OrderStatus["SERVED"] = "served";
    OrderStatus["BILLED"] = "billed";
    OrderStatus["CANCELLED"] = "cancelled";
    OrderStatus["CANCELLATION_REQUESTED"] = "cancellation_requested";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "pending";
    PaymentStatus["ADVANCE_PAID"] = "advance_paid";
    PaymentStatus["PAID"] = "paid";
    PaymentStatus["REFUND_PENDING"] = "refund_pending";
    PaymentStatus["REFUNDED"] = "refunded";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "cash";
    PaymentMethod["RAZORPAY"] = "razorpay";
    PaymentMethod["ONLINE"] = "online";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var AdminRole;
(function (AdminRole) {
    AdminRole["ADMIN"] = "admin";
    AdminRole["KITCHEN"] = "kitchen";
    AdminRole["CASHIER"] = "cashier";
})(AdminRole || (exports.AdminRole = AdminRole = {}));
exports.SOCKET_EVENTS = {
    TABLE_STATUS_CHANGED: 'table:status_changed',
    ORDER_STATUS_CHANGED: 'order:status_changed',
    ORDER_NEW: 'order:new',
    ORDER_UPDATED: 'order:updated',
    SESSION_EXPIRING_SOON: 'session:expiring_soon',
};
exports.GST_RATE = 0.05;
exports.SESSION_TTL_MS = 2 * 60 * 60 * 1000;
exports.EXPIRY_WARNING_THRESHOLD_MS = 10 * 60 * 1000;
//# sourceMappingURL=index.js.map