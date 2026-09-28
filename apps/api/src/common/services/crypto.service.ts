import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { generateSignedQrToken, verifySignedQrToken } from '@chai-partner/shared';

@Injectable()
export class CryptoService {
  private encryptionKey: Buffer;
  private qrSecret: string;

  constructor(private configService: ConfigService) {
    const rawKey = this.configService.get<string>('crypto.phoneEncryptionKey') || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    this.encryptionKey = Buffer.from(rawKey.slice(0, 64), 'hex');
    this.qrSecret = this.configService.get<string>('crypto.qrHmacSecret') || 'chai_partner_qr_signing_secret_min_32_characters_long';
  }

  /**
   * Encrypt sensitive data like phone number using AES-256-GCM
   */
  encrypt(text: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(cipherText: string): string {
    try {
      const [ivHex, authTagHex, encrypted] = cipherText.split(':');
      if (!ivHex || !authTagHex || !encrypted) return cipherText; // Fallback if plain
      const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, Buffer.from(ivHex, 'hex'));
      decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      return cipherText;
    }
  }

  generateQrToken(tableNumber: number): string {
    return generateSignedQrToken(tableNumber, this.qrSecret);
  }

  verifyQrToken(token: string): { valid: boolean; tableNumber?: number } {
    return verifySignedQrToken(token, this.qrSecret);
  }
}
