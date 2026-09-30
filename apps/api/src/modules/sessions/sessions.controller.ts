import {
  Controller,
  Post,
  Body,
  Get,
  Headers,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionSweeperService } from './session-sweeper.service';
import { RequestOtpDto, VerifyOtpDto } from '@chai-partner/shared';
import { JwtService } from '@nestjs/jwt';

import { CryptoService } from '../../common/services/crypto.service';

@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly sweeperService: SessionSweeperService,
    private readonly jwtService: JwtService,
    private readonly cryptoService: CryptoService,
  ) {}

  @Post('verify/request-otp')
  async requestOtp(@Body() body: RequestOtpDto, @Req() req: any) {
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    return this.sessionsService.requestOtp(body, Array.isArray(clientIp) ? clientIp[0] : clientIp);
  }

  @Post('verify/confirm-otp')
  async confirmOtp(@Body() body: VerifyOtpDto) {
    return this.sessionsService.verifyOtpAndCreateSession(body);
  }

  @Get('current')
  async getCurrentSession(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid session authorization');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      const session = await this.sessionsService.validateSession(decoded.sub);
      
      // Calculate final amount dynamically for the completed screen
      let finalAmount = 0;
      if (session.status === 'completed') {
        const queryRunner = this.sessionsService['dataSource'].createQueryRunner();
        await queryRunner.connect();
        const orders = await queryRunner.manager.find('OrderEntity', {
          where: { session_id: session.id },
        });
        finalAmount = orders.reduce((sum: number, order: any) => {
          if (order.status !== 'CANCELLED') {
            return sum + Number(order.total || 0);
          }
          return sum;
        }, 0);
        await queryRunner.release();
      }

      return {
        session: {
          id: session.id,
          table_id: session.table_id,
          customer_name: session.customer_name,
          customer_phone: session.phone ? this.cryptoService.decrypt(session.phone) : undefined,
          customer_email: session.email,
          expires_at: session.expires_at,
          status: session.status,
          rejoin_expires_at: session.rejoin_expires_at,
          finalAmount,
        },
        table: session.table,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }

  @Post('auto-extend')
  async autoExtend(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing session token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      return this.sessionsService.autoExtendSession(decoded.sub);
    } catch {
      throw new UnauthorizedException('Invalid session');
    }
  }

  @Post('admin/sweep')
  async triggerSweep() {
    return this.sweeperService.sweepExpiredSessions();
  }

  @Post('exit')
  async exitSession(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid session authorization');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      return this.sessionsService.exitSession(decoded.sub);
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }

  @Post('complete')
  async completeSession(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid session authorization');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      return this.sessionsService.completeSession(decoded.sub);
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
}
