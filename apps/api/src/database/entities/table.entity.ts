import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TableStatus } from '@chai-partner/shared';

@Entity('tables')
export class TableEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int', unique: true })
  table_number!: number;

  @Column({ type: 'int', default: 4 })
  seat_count!: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: TableStatus.AVAILABLE,
  })
  status!: TableStatus;

  @Column({ type: 'uuid', nullable: true })
  current_session_id?: string | null;

  @Column({ type: 'varchar', length: 120, unique: true })
  qr_token!: string;

  /** Soft-delete / owner-disable. False = temporarily disabled from QR entry. */
  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  /** True soft-delete. Hides from all UI and resolves. */
  @Column({ type: 'boolean', default: false })
  is_deleted!: boolean;

  /** Incremented on QR regeneration to invalidate printed QRs. */
  @Column({ type: 'int', default: 1 })
  qr_version!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
