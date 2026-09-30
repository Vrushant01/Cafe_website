import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TableEntity } from '../../database/entities/table.entity';
import { SessionEntity } from '../../database/entities/session.entity';
import { OrderEntity } from '../../database/entities/order.entity';
import { TablesService } from './tables.service';
import { TablesController } from './tables.controller';
import { EventsGateway } from '../events/events.gateway';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([TableEntity, SessionEntity, OrderEntity])],
  controllers: [TablesController],
  providers: [TablesService, EventsGateway, AdminAuthGuard, RolesGuard],
  exports: [TablesService],
})
export class TablesModule {}
