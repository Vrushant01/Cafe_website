import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SessionStatus } from '@chai-partner/shared';
import { TableEntity } from './table.entity';
import { DateTimeColumnType } from '../column-types';

@Entity('sessions')
@Index('one_active_session_per_table', ['table_id'], {
  unique: true,
  where: "status = 'active'",
})
export class SessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  table_id!: string;

  @ManyToOne(() => TableEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'table_id' })
  table!: TableEntity;

  @Column({ type: 'varchar', length: 100 })
  customer_name!: string;

  @Column({ type: 'text' })
  phone!: string; // Encrypted at rest (AES-256-GCM)

  @Column({ type: 'varchar', length: 150, nullable: true })
  email?: string | null;

  @Column({ type: DateTimeColumnType, nullable: true })
  otp_verified_at?: Date | null;

  @Column({ type: DateTimeColumnType })
  started_at!: Date;

  @Column({ type: DateTimeColumnType })
  expires_at!: Date;

  @Column({
    type: 'varchar',
    length: 20,
    default: SessionStatus.ACTIVE,
  })
  status!: SessionStatus;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
