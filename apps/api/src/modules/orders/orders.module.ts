import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from '../../database/entities/order.entity';
import { OrderItemEntity } from '../../database/entities/order-item.entity';
import { MenuItemEntity } from '../../database/entities/menu-item.entity';
import { TableEntity } from '../../database/entities/table.entity';
import { SessionEntity } from '../../database/entities/session.entity';
import { PaymentEntity } from '../../database/entities/payment.entity';
import { IdempotencyKeyEntity } from '../../database/entities/idempotency-key.entity';
import { OrdersService } from './orders.service';
import { ReconciliationService } from './reconciliation.service';
import { OrdersController } from './orders.controller';
import { EventsGateway } from '../events/events.gateway';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderEntity,
      OrderItemEntity,
      MenuItemEntity,
      TableEntity,
      SessionEntity,
      PaymentEntity,
      IdempotencyKeyEntity,
    ]),
    SessionsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, ReconciliationService, EventsGateway],
  exports: [OrdersService, ReconciliationService],
})
export class OrdersModule {}
