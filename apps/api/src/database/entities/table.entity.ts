import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
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

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
