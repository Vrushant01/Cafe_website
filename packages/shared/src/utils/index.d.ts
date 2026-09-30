export declare function generateSignedQrToken(tableNumber: number, secret: string): string;
export declare function verifySignedQrToken(token: string, secret: string): {
    valid: boolean;
    tableNumber?: number;
};
export declare function calculateOrderTotals(items: Array<{
    unit_price: number;
    qty: number;
}>): {
    subtotal: number;
    tax: number;
    total: number;
};
export declare function maskPhoneNumber(phone: string): string;
