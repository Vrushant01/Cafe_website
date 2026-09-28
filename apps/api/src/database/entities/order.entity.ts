import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrderStatus, PaymentStatus } from '@chai-partner/shared';
import { TableEntity } from './table.entity';
import { SessionEntity } from './session.entity';
import { OrderItemEntity } from './order-item.entity';

@Entity('orders')
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  session_id!: string;

  @ManyToOne(() => SessionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session!: SessionEntity;

  @Column({ type: 'uuid' })
  table_id!: string;

  @ManyToOne(() => TableEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'table_id' })
  table!: TableEntity;

  @Column({ type: 'varchar', length: 50, unique: true })
  order_number!: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: OrderStatus.PLACED,
  })
  status!: OrderStatus;

  @Column({
    type: 'varchar',
    length: 30,
    default: PaymentStatus.PENDING,
  })
  payment_status!: PaymentStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @OneToMany(() => OrderItemEntity, (item) => item.order, { cascade: true })
  items!: OrderItemEntity[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
