import { createHmac } from 'crypto';
import { GST_RATE } from '../constants';

/**
 * Generate a cryptographically signed HMAC token for a table.
 * Allows safe verification of QR code validity and prevents tampering.
 */
export function generateSignedQrToken(tableNumber: number, secret: string): string {
  const payload = `table_${tableNumber}`;
  const hmac = createHmac('sha256', secret).update(payload).digest('hex').slice(0, 16);
  return `${payload}_${hmac}`;
}

/**
 * Verify a signed QR token and extract the table number.
 */
export function verifySignedQrToken(token: string, secret: string): { valid: boolean; tableNumber?: number } {
  const match = token.match(/^table_(\d+)_([a-f0-9]{16})$/);
  if (!match) {
    return { valid: false };
  }

  const tableNumber = parseInt(match[1], 10);
  const expectedHmac = createHmac('sha256', secret)
    .update(`table_${tableNumber}`)
    .digest('hex')
    .slice(0, 16);

  if (match[2] !== expectedHmac) {
    return { valid: false };
  }

  return { valid: true, tableNumber };
}

/**
 * Calculate financial totals: subtotal, GST (5%), and rounded grand total.
 */
export function calculateOrderTotals(items: Array<{ unit_price: number; qty: number }>): {
  subtotal: number;
  tax: number;
  total: number;
} {
  const subtotal = items.reduce((acc, item) => acc + item.unit_price * item.qty, 0);
  const tax = Math.round(subtotal * GST_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  return { subtotal, tax, total };
}

/**
 * Mask a phone number to only show last 4 digits (e.g. +91 ******4567)
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 4) return '****';
  const clean = phone.trim();
  const last4 = clean.slice(-4);
  const prefix = clean.startsWith('+91') ? '+91 ' : '';
  return `${prefix}******${last4}`;
}
