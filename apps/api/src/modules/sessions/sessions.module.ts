import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SessionEntity } from '../../database/entities/session.entity';
import { TableEntity } from '../../database/entities/table.entity';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { EventsGateway } from '../events/events.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([SessionEntity, TableEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('jwt.secret'),
        signOptions: { expiresIn: config.get('jwt.expiresIn') },
      }),
    }),
  ],
  controllers: [SessionsController],
  providers: [SessionsService, EventsGateway],
  exports: [SessionsService, JwtModule],
})
export class SessionsModule {}
