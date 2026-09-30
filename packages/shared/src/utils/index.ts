import { createHmac } from 'crypto';
import { GST_RATE } from '../constants';

/**
 * Generate a cryptographically signed HMAC token for a table.
 * Version is incorporated so that QR regeneration always produces a different token.
 * Format: table_<number>_v<version>_<hmac16>
 */
export function generateSignedQrToken(tableNumber: number, secret: string, version: number = 1): string {
  const payload = `table_${tableNumber}_v${version}`;
  const hmac = createHmac('sha256', secret).update(payload).digest('hex').slice(0, 16);
  return `${payload}_${hmac}`;
}

/**
 * Verify a signed QR token and extract the table number.
 * Supports both versioned format (table_N_vV_hmac) and legacy format (table_N_hmac).
 */
export function verifySignedQrToken(token: string, secret: string): { valid: boolean; tableNumber?: number } {
  // Versioned format: table_106_v2_fc1ecd6c354ecab7
  const versionedMatch = token.match(/^table_(\d+)_v(\d+)_([a-f0-9]{16})$/);
  if (versionedMatch) {
    const tableNumber = parseInt(versionedMatch[1], 10);
    const version = parseInt(versionedMatch[2], 10);
    const expectedHmac = createHmac('sha256', secret)
      .update(`table_${tableNumber}_v${version}`)
      .digest('hex')
      .slice(0, 16);
    if (versionedMatch[3] !== expectedHmac) return { valid: false };
    return { valid: true, tableNumber };
  }

  // Legacy format: table_106_fc1ecd6c354ecab7
  const legacyMatch = token.match(/^table_(\d+)_([a-f0-9]{16})$/);
  if (legacyMatch) {
    const tableNumber = parseInt(legacyMatch[1], 10);
    const expectedHmac = createHmac('sha256', secret)
      .update(`table_${tableNumber}`)
      .digest('hex')
      .slice(0, 16);
    if (legacyMatch[2] !== expectedHmac) return { valid: false };
    return { valid: true, tableNumber };
  }

  return { valid: false };
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
  return `+91 ******${last4}`;
}
