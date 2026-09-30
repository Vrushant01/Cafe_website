import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AdminUserEntity } from '../../database/entities/admin-user.entity';
import { AdminRole, CreateStaffDto, UpdateStaffDto } from '@chai-partner/shared';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(AdminUserEntity)
    private userRepo: Repository<AdminUserEntity>,
  ) {}

  private sanitizeUser(user: AdminUserEntity) {
    const { password_hash, ...rest } = user;
    return {
      ...rest,
      is_active: user.is_active !== false,
    };
  }

  async findAll() {
    const users = await this.userRepo.find({
      order: {
        created_at: 'ASC',
      },
    });

    return users.map((u) => this.sanitizeUser(u));
  }

  async findById(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Staff member with ID ${id} not found`);
    }
    return this.sanitizeUser(user);
  }

  async create(dto: CreateStaffDto) {
    const emailNormalized = dto.email.toLowerCase().trim();

    const existing = await this.userRepo.findOne({
      where: { email: emailNormalized },
    });
    if (existing) {
      throw new BadRequestException('A staff member with this email already exists');
    }

    if (!Object.values(AdminRole).includes(dto.role)) {
      throw new BadRequestException(`Invalid role: ${dto.role}`);
    }

    if (!dto.password || dto.password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters long');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const staff = this.userRepo.create({
      name: dto.name.trim(),
      email: emailNormalized,
      phone: dto.phone?.trim() || null,
      role: dto.role,
      password_hash: passwordHash,
      is_active: true,
    });

    const saved = await this.userRepo.save(staff);
    return this.sanitizeUser(saved);
  }

  async update(id: string, dto: UpdateStaffDto) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Staff member with ID ${id} not found`);
    }

    if (dto.name !== undefined && dto.name.trim()) {
      user.name = dto.name.trim();
    }

    if (dto.phone !== undefined) {
      user.phone = dto.phone ? dto.phone.trim() : null;
    }

    if (dto.role !== undefined) {
      if (!Object.values(AdminRole).includes(dto.role)) {
        throw new BadRequestException(`Invalid role: ${dto.role}`);
      }
      user.role = dto.role;
    }

    if (dto.password && dto.password.trim().length >= 6) {
      user.password_hash = await bcrypt.hash(dto.password.trim(), 10);
    }

    if (dto.is_active !== undefined) {
      user.is_active = Boolean(dto.is_active);
    }

    const saved = await this.userRepo.save(user);
    return this.sanitizeUser(saved);
  }

  async updateStatus(id: string, isActive: boolean, currentAdminId?: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Staff member with ID ${id} not found`);
    }

    if (currentAdminId && user.id === currentAdminId && !isActive) {
      throw new BadRequestException('You cannot deactivate your own administrative account');
    }

    user.is_active = Boolean(isActive);
    const saved = await this.userRepo.save(user);
    return this.sanitizeUser(saved);
  }
}
