import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { dataSourceOptions } from './database/data-source';
import { CryptoModule } from './common/services/crypto.module';
import { AuditModule } from './modules/audit/audit.module';
import { TablesModule } from './modules/tables/tables.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { MenuModule } from './modules/menu/menu.module';
import { OrdersModule } from './modules/orders/orders.module';
import { AuthModule } from './modules/auth/auth.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { RefundsModule } from './modules/refunds/refunds.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    CryptoModule,
    AuditModule,
    TablesModule,
    SessionsModule,
    MenuModule,
    OrdersModule,
    AuthModule,
    PaymentsModule,
    RefundsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
