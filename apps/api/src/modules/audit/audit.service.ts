import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from '../../database/entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private auditRepo: Repository<AuditLogEntity>,
  ) {}

  async log(data: {
    actor_id: string;
    actor_type?: 'admin' | 'system' | 'customer';
    action: string;
    entity: string;
    entity_id: string;
    metadata?: Record<string, any>;
  }): Promise<AuditLogEntity> {
    const entry = this.auditRepo.create({
      actor_id: data.actor_id,
      actor_type: data.actor_type || 'admin',
      action: data.action,
      entity: data.entity,
      entity_id: data.entity_id,
      metadata: data.metadata || null,
    });
    return this.auditRepo.save(entry);
  }
}
