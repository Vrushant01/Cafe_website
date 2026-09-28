import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TableEntity } from '../../database/entities/table.entity';
import { SessionEntity } from '../../database/entities/session.entity';
import { TablesService } from './tables.service';
import { TablesController } from './tables.controller';
import { EventsGateway } from '../events/events.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([TableEntity, SessionEntity])],
  controllers: [TablesController],
  providers: [TablesService, EventsGateway],
  exports: [TablesService],
})
export class TablesModule {}
