export default () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  apiUrl: process.env.API_URL || 'http://localhost:4000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  database: {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'chai_partner',
    ...(process.env.DATABASE_URL 
      ? { 
          url: process.env.DATABASE_URL, 
          ssl: { rejectUnauthorized: false } 
        } 
      : {}
    ),
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'super_secret_jwt_key_chai_partner_change_in_production_2026',
    expiresIn: '24h',
  },
  crypto: {
    qrHmacSecret: process.env.QR_HMAC_SECRET || 'chai_partner_qr_signing_secret_min_32_characters_long',
    phoneEncryptionKey: process.env.PHONE_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  },
  otp: {
    provider: process.env.OTP_PROVIDER || 'mock',
    mockOtp: '123456',
  },
  sentry: {
    dsn: process.env.SENTRY_DSN || '',
  },
  cafe: {
    name: process.env.CAFE_NAME || 'Chai Partner',
    defaultTableCount: parseInt(process.env.DEFAULT_TABLE_COUNT || '25', 10),
    sessionTtlMinutes: parseInt(process.env.SESSION_TTL_MINUTES || '120', 10),
    gstPercent: parseFloat(process.env.GST_PERCENT || '5.0'),
  },
  payments: {
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key',
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_placeholder_secret',
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret_placeholder',
  },
});
