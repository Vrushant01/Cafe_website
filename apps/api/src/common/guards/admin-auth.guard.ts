import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Optional,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    @Optional() private jwtService?: JwtService,
    @Optional() private configService?: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    // 1. Direct header simulation for automated testing or internal caller
    const testRole = request.headers['x-admin-role'];
    if (testRole) {
      request.user = {
        id: request.headers['x-admin-user-id'] || 'test-admin-id',
        name: request.headers['x-admin-user-name'] || 'Staff Member',
        role: testRole,
        email: request.headers['x-admin-user-email'] || 'staff@chaipartner.in',
      };
      return true;
    }

    // 2. Validate Bearer Token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication token required');
    }

    const token = authHeader.split(' ')[1];
    try {
      let decoded: any;
      if (this.jwtService) {
        decoded = this.jwtService.verify(token);
      } else {
        const jwt = require('jsonwebtoken');
        const secret =
          this.configService?.get('jwt.secret') ||
          process.env.JWT_SECRET ||
          'super_secret_jwt_key_chai_partner_change_in_production_2026';
        decoded = jwt.verify(token, secret);
      }

      if (!decoded || !decoded.role) {
        throw new UnauthorizedException('Admin authentication required: token is not an admin credential');
      }

      request.user = {
        id: decoded.sub || decoded.id,
        name: decoded.name || 'Staff Member',
        role: decoded.role,
        email: decoded.email,
      };

      return true;
    } catch (err: any) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }
}
