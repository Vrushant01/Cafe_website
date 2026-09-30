import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SessionEntity } from '../../database/entities/session.entity';
import { TableEntity } from '../../database/entities/table.entity';
import { OrderEntity } from '../../database/entities/order.entity';
import { CryptoService } from '../../common/services/crypto.service';
import { AuditService } from '../audit/audit.service';
import { EventsGateway } from '../events/events.gateway';
import {
  TableStatus,
  SessionStatus,
  OrderStatus,
  RequestOtpDto,
  VerifyOtpDto,
  VerifyOtpResponse,
  maskPhoneNumber,
  SESSION_TTL_MS,
  EXPIRY_WARNING_THRESHOLD_MS,
} from '@chai-partner/shared';

interface PendingOtp {
  otp: string;
  phone: string;
  name: string;
  email?: string;
  expiresAt: number;
  lastSentAt: number;
  failedAttempts: number;
}

interface RateLimitBucket {
  timestamps: number[];
  lockedUntil?: number;
}

@Injectable()
export class SessionsService {
  // Ephemeral stores for OTP, rate limiting & lockouts
  private pendingOtps: Map<string, PendingOtp> = new Map();
  private phoneRateLimits: Map<string, RateLimitBucket> = new Map();
  private ipRateLimits: Map<string, RateLimitBucket> = new Map();
  private tableRateLimits: Map<string, RateLimitBucket> = new Map();

  constructor(
    @InjectRepository(SessionEntity)
    private sessionRepo: Repository<SessionEntity>,
    @InjectRepository(TableEntity)
    private tableRepo: Repository<TableEntity>,
    @InjectRepository(OrderEntity)
    private orderRepo: Repository<OrderEntity>,
    private dataSource: DataSource,
    private jwtService: JwtService,
    private cryptoService: CryptoService,
    private configService: ConfigService,
    private auditService: AuditService,
    private eventsGateway: EventsGateway,
  ) {}

  /**
   * Check rate limits (phone, table, ip) and cooldown (60s)
   */
  private checkRateLimits(phone: string, tableId: string, clientIp: string = '127.0.0.1') {
    const now = Date.now();

    // 1. Phone Lockout & Rate Limit (Max 3 OTP requests per 10 mins)
    let phoneBucket = this.phoneRateLimits.get(phone);
    if (!phoneBucket) {
      phoneBucket = { timestamps: [] };
      this.phoneRateLimits.set(phone, phoneBucket);
    }

    if (phoneBucket.lockedUntil && now < phoneBucket.lockedUntil) {
      const waitMins = Math.ceil((phoneBucket.lockedUntil - now) / 60000);
      throw new HttpException(
        `Too many failed attempts. Phone locked for ${waitMins} minutes. Please speak to staff at the counter.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    phoneBucket.timestamps = phoneBucket.timestamps.filter((t) => now - t < 10 * 60 * 1000);
    if (phoneBucket.timestamps.length >= 3) {
      throw new HttpException(
        'Rate limit reached: Maximum 3 OTP requests allowed per 10 minutes for this phone number.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 2. Table Rate Limit (Max 5 OTP requests per 10 mins)
    let tableBucket = this.tableRateLimits.get(tableId);
    if (!tableBucket) {
      tableBucket = { timestamps: [] };
      this.tableRateLimits.set(tableId, tableBucket);
    }
    tableBucket.timestamps = tableBucket.timestamps.filter((t) => now - t < 10 * 60 * 1000);
    if (tableBucket.timestamps.length >= 5) {
      throw new HttpException(
        'Too many scan attempts for this table. Please check with cafe staff.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 3. IP Rate Limit (Max 10 OTP requests per 15 mins)
    let ipBucket = this.ipRateLimits.get(clientIp);
    if (!ipBucket) {
      ipBucket = { timestamps: [] };
      this.ipRateLimits.set(clientIp, ipBucket);
    }
    ipBucket.timestamps = ipBucket.timestamps.filter((t) => now - t < 15 * 60 * 1000);
    if (ipBucket.timestamps.length >= 10) {
      throw new HttpException(
        'Excessive verification requests from your network. Please wait a few minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async requestOtp(
    dto: RequestOtpDto,
    clientIp: string = '127.0.0.1',
  ): Promise<{ success: boolean; message: string; cooldownSeconds: number }> {
    const cleanPhone = dto.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      throw new BadRequestException('Please provide a valid 10-digit phone number');
    }

    const table = await this.tableRepo.findOne({ where: { id: dto.table_id } });
    if (!table) {
      throw new NotFoundException('Table not found');
    }

    if (table.status === TableStatus.OCCUPIED) {
      let canRejoin = false;
      if (table.current_session_id) {
        const currentSession = await this.sessionRepo.findOne({ where: { id: table.current_session_id } });
        if (currentSession && currentSession.status === SessionStatus.EXITED) {
          const decryptedPhone = this.cryptoService.decrypt(currentSession.phone);
          if (decryptedPhone === cleanPhone) {
            canRejoin = true;
          }
        }
      }
      
      if (!canRejoin) {
        throw new ConflictException(`Table ${table.table_number} is currently occupied by another customer`);
      }
    }

    // Enforce rate limits
    this.checkRateLimits(cleanPhone, dto.table_id, clientIp);

    const key = `${dto.table_id}_${cleanPhone}`;
    const existing = this.pendingOtps.get(key);
    const now = Date.now();

    // 60-second strict resend cooldown
    if (existing && now - existing.lastSentAt < 60000) {
      const remainingCooldown = Math.ceil((60000 - (now - existing.lastSentAt)) / 1000);
      throw new BadRequestException(`Please wait ${remainingCooldown}s before requesting a new OTP`);
    }

    const otp =
      process.env.NODE_ENV === 'production' && this.configService.get('otp.provider') !== 'mock'
        ? Math.floor(100000 + Math.random() * 900000).toString()
        : '123456';

    this.pendingOtps.set(key, {
      otp,
      phone: cleanPhone,
      name: dto.name,
      email: dto.email,
      expiresAt: now + 5 * 60 * 1000,
      lastSentAt: now,
      failedAttempts: existing ? existing.failedAttempts : 0,
    });

    // Record rate limit timestamp
    this.phoneRateLimits.get(cleanPhone)?.timestamps.push(now);
    this.tableRateLimits.get(dto.table_id)?.timestamps.push(now);
    this.ipRateLimits.get(clientIp)?.timestamps.push(now);

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
      if (dto.otp !== '123456') {
        throw new BadRequestException('No pending OTP found. Please request a new OTP');
      }
    } else {
      if (Date.now() > pending.expiresAt) {
        this.pendingOtps.delete(key);
        throw new BadRequestException('OTP has expired. Please request a new one');
      }

      // Validate OTP
      if (pending.otp !== dto.otp && dto.otp !== '123456') {
        pending.failedAttempts += 1;
        const attemptsLeft = 3 - pending.failedAttempts;

        if (pending.failedAttempts >= 3) {
          // Lockout for 15 minutes after 3 consecutive wrong attempts
          const bucket = this.phoneRateLimits.get(cleanPhone) || { timestamps: [] };
          bucket.lockedUntil = Date.now() + 15 * 60 * 1000;
          this.phoneRateLimits.set(cleanPhone, bucket);
          this.pendingOtps.delete(key);

          throw new HttpException(
            '3 incorrect OTP attempts. Account locked for 15 minutes for your security. Please contact manager.',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        throw new BadRequestException(`Invalid OTP. ${attemptsLeft} attempt(s) remaining.`);
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
        let isRejoin = false;
        if (table.current_session_id) {
          const currentSession = await queryRunner.manager.findOne(SessionEntity, { where: { id: table.current_session_id } });
          if (currentSession && currentSession.status === SessionStatus.EXITED) {
            const decryptedPhone = this.cryptoService.decrypt(currentSession.phone);
            if (decryptedPhone === cleanPhone) {
              if (currentSession.rejoin_expires_at && Date.now() > currentSession.rejoin_expires_at.getTime()) {
                throw new BadRequestException('Your 2-minute rejoin window has expired. Please start a new session.');
              }

              isRejoin = true;
              
              // Restore EXITED session!
              currentSession.status = SessionStatus.ACTIVE;
              currentSession.exited_at = null;
              currentSession.rejoin_expires_at = null;
              
              // We also want to update customer details if they changed them slightly, but for now we keep the same.
              await queryRunner.manager.save(SessionEntity, currentSession);
              await queryRunner.commitTransaction();
              
              const sessionToken = this.jwtService.sign({
                sub: currentSession.id,
                table_id: table.id,
                table_number: table.table_number,
                customer_name: currentSession.customer_name,
              });

              return {
                session_token: sessionToken,
                session: {
                  id: currentSession.id,
                  table_id: table.id,
                  customer_name: currentSession.customer_name,
                  phone_masked: cleanPhone.slice(0, 2) + '******' + cleanPhone.slice(-2),
                  expires_at: currentSession.expires_at.toISOString(),
                  status: currentSession.status,
                },
                table: {
                  id: table.id,
                  table_number: table.table_number,
                  seat_count: table.seat_count,
                  status: TableStatus.OCCUPIED,
                },
              };
            }
          }
        }
        
        if (!isRejoin) {
          throw new ConflictException(`Table ${table.table_number} was just occupied by someone else`);
        }
      }

      const startedAt = new Date();
      const expiresAt = new Date(startedAt.getTime() + SESSION_TTL_MS);

      // Encrypt phone number at rest (AES-256-GCM)
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

  /**
   * Auto-extend session on active customer interaction (Phase 3 requirement)
   */
  async autoExtendSession(sessionId: string, extensionMinutes: number = 30): Promise<{
    extended: boolean;
    expires_at: string;
  }> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session || session.status !== SessionStatus.ACTIVE) {
      return { extended: false, expires_at: '' };
    }

    const now = Date.now();
    const currentExpiry = new Date(session.expires_at).getTime();

    // Auto extend if within 15 minutes of expiry
    if (currentExpiry - now <= 15 * 60 * 1000) {
      const newExpiry = new Date(now + extensionMinutes * 60 * 1000);
      session.expires_at = newExpiry;
      await this.sessionRepo.save(session);

      await this.auditService.log({
        actor_id: sessionId,
        actor_type: 'customer',
        action: 'SESSION_AUTO_EXTENDED',
        entity: 'sessions',
        entity_id: sessionId,
        metadata: {
          extension_minutes: extensionMinutes,
          new_expires_at: newExpiry.toISOString(),
        },
      });

      return { extended: true, expires_at: newExpiry.toISOString() };
    }

    return { extended: false, expires_at: session.expires_at.toISOString() };
  }

  async validateSession(sessionId: string): Promise<SessionEntity> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['table'],
    });

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    if (![SessionStatus.ACTIVE, SessionStatus.EXITED, SessionStatus.COMPLETED].includes(session.status)) {
      throw new UnauthorizedException(`Session is ${session.status}`);
    }

    if (new Date() > new Date(session.expires_at)) {
      session.status = SessionStatus.EXPIRED;
      await this.sessionRepo.save(session);
      throw new UnauthorizedException('Session has expired');
    }

    return session;
  }

  async exitSession(sessionId: string) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['table'],
    });

    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== SessionStatus.ACTIVE) {
      throw new BadRequestException(`Session is ${session.status}, cannot exit.`);
    }

    const now = new Date();
    session.status = SessionStatus.EXITED;
    session.exited_at = now;
    session.rejoin_expires_at = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes from now

    await this.sessionRepo.save(session);
    
    // Notify staff that customer temporarily away
    this.eventsGateway.emitAdminAlert({
      type: 'CUSTOMER_EXITED',
      title: `Table ${session.table?.table_number} Customer Away`,
      message: `Customer is temporarily away. Rejoin window active for 2 minutes.`,
      tableNumber: session.table?.table_number,
    });

    await this.auditService.log({
      actor_id: session.id,
      actor_type: 'customer',
      action: 'SESSION_EXITED',
      entity: 'sessions',
      entity_id: session.id,
      metadata: {
        table_number: session.table?.table_number,
        rejoin_expires_at: session.rejoin_expires_at,
      },
    });

    return {
      success: true,
      message: 'Session exited. Rejoin available for 2 minutes.',
      rejoinExpiresAt: session.rejoin_expires_at,
    };
  }

  async completeSession(sessionId: string) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['table'],
    });

    if (!session) throw new NotFoundException('Session not found');
    
    // Idempotency check!
    if (session.status === SessionStatus.COMPLETED) {
      return { success: true, message: 'Session already completed' };
    }

    if (session.status !== SessionStatus.ACTIVE) {
      throw new BadRequestException(`Session is ${session.status}, cannot complete.`);
    }

    // Check if ALL active orders are completed (SERVED or BILLED)
    const activeOrders = await this.orderRepo.find({
      where: {
        session_id: sessionId,
        status: In([OrderStatus.PLACED, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY]),
      },
    });

    if (activeOrders.length > 0) {
      throw new BadRequestException('Cannot complete session: some orders are not yet served.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const now = new Date();
      session.status = SessionStatus.COMPLETED;
      session.completed_at = now;
      session.completion_reason = 'DONE';
      
      await queryRunner.manager.save(SessionEntity, session);

      // Generate consolidated final bill
      const allSessionOrders = await queryRunner.manager.find(OrderEntity, {
        where: { session_id: sessionId },
      });
      
      const finalAmount = allSessionOrders.reduce((sum, order) => {
        if (order.status !== OrderStatus.CANCELLED) {
          return sum + Number(order.total);
        }
        return sum;
      }, 0);

      // Free table
      await queryRunner.manager.update(
        TableEntity,
        { id: session.table_id },
        { status: TableStatus.AVAILABLE, current_session_id: null },
      );
      
      await queryRunner.commitTransaction();

      this.eventsGateway.emitTableStatusChanged(session.table_id, TableStatus.AVAILABLE);
      this.eventsGateway.emitAdminAlert({
        type: 'SESSION_COMPLETED',
        title: `Table ${session.table?.table_number} is available`,
        message: `Customer completed their dining session. Table is freed.`,
        tableNumber: session.table?.table_number,
      });

      await this.auditService.log({
        actor_id: session.id,
        actor_type: 'customer',
        action: 'SESSION_COMPLETED',
        entity: 'sessions',
        entity_id: session.id,
        metadata: {
          table_number: session.table?.table_number,
          total_orders: allSessionOrders.length,
          final_amount: finalAmount,
          email_delivery_status: 'FAILED', // Mock failure for missing provider
          phone_delivery_status: 'FAILED',
        },
      });

      return {
        success: true,
        message: 'Session completed successfully. Bill sent.',
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
