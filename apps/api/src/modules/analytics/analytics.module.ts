import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from '../../database/entities/order.entity';
import { OrderItemEntity } from '../../database/entities/order-item.entity';
import { PaymentEntity } from '../../database/entities/payment.entity';
import { SessionEntity } from '../../database/entities/session.entity';
import { MenuItemEntity } from '../../database/entities/menu-item.entity';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderEntity,
      OrderItemEntity,
      PaymentEntity,
      SessionEntity,
      MenuItemEntity,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AdminAuthGuard, RolesGuard],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
