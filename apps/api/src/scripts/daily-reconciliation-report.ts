import { AppDataSource } from '../database/data-source';
import { OrderEntity } from '../database/entities/order.entity';
import { AuditLogEntity } from '../database/entities/audit-log.entity';
import { ReconciliationService } from '../modules/orders/reconciliation.service';
import { AuditService } from '../modules/audit/audit.service';
import { CryptoService } from '../common/services/crypto.service';
import { ConfigService } from '@nestjs/config';

async function runDailyReconciliation() {
  console.log('--- Daily Pending-Payment Reconciliation Report ---');
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const configService = new ConfigService({
    crypto: {
      phoneEncryptionKey: process.env.PHONE_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    },
  });

  const cryptoService = new CryptoService(configService);
  const auditService = new AuditService(AppDataSource.getRepository(AuditLogEntity));
  const reconciliationService = new ReconciliationService(
    AppDataSource.getRepository(OrderEntity),
    cryptoService,
    auditService,
  );

  const report = await reconciliationService.generatePendingPaymentReport(2);

  console.log(`Generated At: ${report.generated_at}`);
  console.log(`Age Threshold: Orders older than ${report.threshold_hours} hours`);
  console.log(`Total Pending Orders: ${report.total_pending_orders}`);
  console.log(`Total Uncollected Revenue: ₹${report.total_uncollected_amount.toFixed(2)}`);
  console.log('----------------------------------------------------');

  if (report.orders.length === 0) {
    console.log('✅ No unreconciled pending orders found beyond threshold. All clean!');
  } else {
    console.table(
      report.orders.map((o) => ({
        'Order #': o.order_number,
        'Table': `T${o.table_number}`,
        'Customer': o.customer_name,
        'Phone': o.phone_masked,
        'Total (₹)': o.total,
        'Status': o.status,
        'Age (mins)': o.age_minutes,
      })),
    );
  }
}

if (require.main === module) {
  runDailyReconciliation()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Reconciliation failed:', err);
      process.exit(1);
    });
}
