import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('idempotency_keys')
@Index('one_idempotent_order', ['session_id', 'key'], { unique: true })
export class IdempotencyKeyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  session_id!: string;

  @Column({ type: 'varchar', length: 150 })
  key!: string;

  @Column({ type: 'simple-json' })
  response_snapshot!: Record<string, any>;

  @CreateDateColumn()
  created_at!: Date;
}
