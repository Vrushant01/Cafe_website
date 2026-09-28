import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefundEntity } from '../../database/entities/refund.entity';
import { PaymentEntity } from '../../database/entities/payment.entity';
import { OrderEntity } from '../../database/entities/order.entity';
import { TableEntity } from '../../database/entities/table.entity';
import { SessionEntity } from '../../database/entities/session.entity';
import { RefundsService } from './refunds.service';
import { RefundsController } from './refunds.controller';
import { EventsGateway } from '../events/events.gateway';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RefundEntity,
      PaymentEntity,
      OrderEntity,
      TableEntity,
      SessionEntity,
    ]),
  ],
  controllers: [RefundsController],
  providers: [RefundsService, EventsGateway, AdminAuthGuard, RolesGuard],
  exports: [RefundsService],
})
export class RefundsModule {}
