import { Controller, Post, Body, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { RequestOtpDto, VerifyOtpDto } from '@chai-partner/shared';
import { JwtService } from '@nestjs/jwt';

@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('verify/request-otp')
  async requestOtp(@Body() body: RequestOtpDto) {
    return this.sessionsService.requestOtp(body);
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
}
