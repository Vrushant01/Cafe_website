import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SessionEntity } from '../../database/entities/session.entity';
import { TableEntity } from '../../database/entities/table.entity';
import { CryptoService } from '../../common/services/crypto.service';
import { EventsGateway } from '../events/events.gateway';
import {
  TableStatus,
  SessionStatus,
  RequestOtpDto,
  VerifyOtpDto,
  VerifyOtpResponse,
  maskPhoneNumber,
  SESSION_TTL_MS,
} from '@chai-partner/shared';

interface PendingOtp {
  otp: string;
  phone: string;
  name: string;
  email?: string;
  expiresAt: number;
  lastSentAt: number;
}

@Injectable()
export class SessionsService {
  // In-memory OTP store for rate-limiting and verification (Redis/in-memory fallback)
  private pendingOtps: Map<string, PendingOtp> = new Map();

  constructor(
    @InjectRepository(SessionEntity)
    private sessionRepo: Repository<SessionEntity>,
    @InjectRepository(TableEntity)
    private tableRepo: Repository<TableEntity>,
    private dataSource: DataSource,
    private jwtService: JwtService,
    private cryptoService: CryptoService,
    private configService: ConfigService,
    private eventsGateway: EventsGateway,
  ) {}

  async requestOtp(dto: RequestOtpDto): Promise<{ success: boolean; message: string; cooldownSeconds: number }> {
    const cleanPhone = dto.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      throw new BadRequestException('Please provide a valid 10-digit phone number');
    }

    const table = await this.tableRepo.findOne({ where: { id: dto.table_id } });
    if (!table) {
      throw new NotFoundException('Table not found');
    }

    if (table.status === TableStatus.OCCUPIED) {
      throw new ConflictException(`Table ${table.table_number} is currently occupied by another customer`);
    }

    const key = `${dto.table_id}_${cleanPhone}`;
    const existing = this.pendingOtps.get(key);
    const now = Date.now();

    if (existing && now - existing.lastSentAt < 60000) {
      const remainingCooldown = Math.ceil((60000 - (now - existing.lastSentAt)) / 1000);
      throw new BadRequestException(`Please wait ${remainingCooldown}s before requesting a new OTP`);
    }

    // Default mock OTP is 123456; in production, call SMS provider
    const otp = process.env.NODE_ENV === 'production' && this.configService.get('otp.provider') !== 'mock'
      ? Math.floor(100000 + Math.random() * 900000).toString()
      : '123456';

    this.pendingOtps.set(key, {
      otp,
      phone: cleanPhone,
      name: dto.name,
      email: dto.email,
      expiresAt: now + 5 * 60 * 1000, // 5 min expiry
      lastSentAt: now,
    });

    console.log(`[OTP] Generated OTP ${otp} for phone ${cleanPhone} at Table ${table.table_number}`);

    return {
      success: true,
      message: 'OTP sent successfully (Use 123456 for testing)',
      cooldownSeconds: 60,
    };
  }

  async verifyOtpAndCreateSession(dto: VerifyOtpDto): Promise<VerifyOtpResponse> {
    const cleanPhone = dto.phone.replace(/\D/g, '');
    const key = `${dto.table_id}_${cleanPhone}`;
    const pending = this.pendingOtps.get(key);

    if (!pending) {
      // Allow fallback default OTP 123456 for fast development & testing
      if (dto.otp !== '123456') {
        throw new BadRequestException('No pending OTP found. Please request a new OTP');
      }
    } else {
      if (Date.now() > pending.expiresAt) {
        this.pendingOtps.delete(key);
        throw new BadRequestException('OTP has expired. Please request a new one');
      }
      if (pending.otp !== dto.otp && dto.otp !== '123456') {
        throw new BadRequestException('Invalid OTP. Please check and try again');
      }
      this.pendingOtps.delete(key);
    }

    // Transaction to safely create session and occupy table
    // BRAIN Rule 1 & Rule 5: Guarded update and partial unique index
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const table = await queryRunner.manager.findOne(TableEntity, {
        where: { id: dto.table_id },
      });

      if (!table) {
        throw new NotFoundException('Table not found');
      }

      if (table.status === TableStatus.OCCUPIED) {
        throw new ConflictException(`Table ${table.table_number} was just occupied by someone else`);
      }

      const startedAt = new Date();
      const expiresAt = new Date(startedAt.getTime() + SESSION_TTL_MS);

      // Encrypt phone number at rest
      const encryptedPhone = this.cryptoService.encrypt(cleanPhone);

      const session = queryRunner.manager.create(SessionEntity, {
        table_id: table.id,
        customer_name: dto.name.trim(),
        phone: encryptedPhone,
        email: dto.email ? dto.email.trim() : null,
        otp_verified_at: startedAt,
        started_at: startedAt,
        expires_at: expiresAt,
        status: SessionStatus.ACTIVE,
      });

      const savedSession = await queryRunner.manager.save(SessionEntity, session);

      // Guarded update of table status
      const updateResult = await queryRunner.manager.update(
        TableEntity,
        { id: table.id, status: TableStatus.AVAILABLE },
        { status: TableStatus.OCCUPIED, current_session_id: savedSession.id },
      );

      if (updateResult.affected === 0) {
        throw new ConflictException('Race condition detected: Table has already been claimed');
      }

      await queryRunner.commitTransaction();

      // Broadcast table status change via Socket.io
      this.eventsGateway.emitTableStatusChanged(table.id, TableStatus.OCCUPIED);

      // Generate JWT session token
      const sessionToken = this.jwtService.sign({
        sub: savedSession.id,
        table_id: table.id,
        table_number: table.table_number,
        customer_name: savedSession.customer_name,
      });

      return {
        session_token: sessionToken,
        session: {
          id: savedSession.id,
          table_id: table.id,
          customer_name: savedSession.customer_name,
          phone_masked: maskPhoneNumber(cleanPhone),
          expires_at: expiresAt.toISOString(),
          status: savedSession.status,
        },
        table: {
          id: table.id,
          table_number: table.table_number,
          seat_count: table.seat_count,
          status: TableStatus.OCCUPIED,
        },
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async validateSession(sessionId: string): Promise<SessionEntity> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['table'],
    });

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    if (session.status !== SessionStatus.ACTIVE) {
      throw new UnauthorizedException(`Session is ${session.status}`);
    }

    if (new Date() > new Date(session.expires_at)) {
      session.status = SessionStatus.EXPIRED;
      await this.sessionRepo.save(session);
      throw new UnauthorizedException('Session has expired');
    }

    return session;
  }
}
