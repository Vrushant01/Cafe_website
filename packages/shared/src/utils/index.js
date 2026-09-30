"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSignedQrToken = generateSignedQrToken;
exports.verifySignedQrToken = verifySignedQrToken;
exports.calculateOrderTotals = calculateOrderTotals;
exports.maskPhoneNumber = maskPhoneNumber;
const crypto_1 = require("crypto");
const constants_1 = require("../constants");
function generateSignedQrToken(tableNumber, secret) {
    const payload = `table_${tableNumber}`;
    const hmac = (0, crypto_1.createHmac)('sha256', secret).update(payload).digest('hex').slice(0, 16);
    return `${payload}_${hmac}`;
}
function verifySignedQrToken(token, secret) {
    const match = token.match(/^table_(\d+)_([a-f0-9]{16})$/);
    if (!match) {
        return { valid: false };
    }
    const tableNumber = parseInt(match[1], 10);
    const expectedHmac = (0, crypto_1.createHmac)('sha256', secret)
        .update(`table_${tableNumber}`)
        .digest('hex')
        .slice(0, 16);
    if (match[2] !== expectedHmac) {
        return { valid: false };
    }
    return { valid: true, tableNumber };
}
function calculateOrderTotals(items) {
    const subtotal = items.reduce((acc, item) => acc + item.unit_price * item.qty, 0);
    const tax = Math.round(subtotal * constants_1.GST_RATE * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    return { subtotal, tax, total };
}
function maskPhoneNumber(phone) {
    if (!phone || phone.length < 4)
        return '****';
    const clean = phone.trim();
    const last4 = clean.slice(-4);
    return `+91 ******${last4}`;
}
//# sourceMappingURL=index.js.map