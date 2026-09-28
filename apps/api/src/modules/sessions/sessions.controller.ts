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

@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly sweeperService: SessionSweeperService,
    private readonly jwtService: JwtService,
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
      return {
        session: {
          id: session.id,
          table_id: session.table_id,
          customer_name: session.customer_name,
          expires_at: session.expires_at,
          status: session.status,
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
}
