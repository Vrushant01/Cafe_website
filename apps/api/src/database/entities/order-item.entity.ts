import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrderEntity } from './order.entity';
import { MenuItemEntity } from './menu-item.entity';

@Entity('order_items')
export class OrderItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  order_id!: string;

  @ManyToOne(() => OrderEntity, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: OrderEntity;

  @Column({ type: 'uuid' })
  menu_item_id!: string;

  @ManyToOne(() => MenuItemEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'menu_item_id' })
  menu_item?: MenuItemEntity;

  @Column({ type: 'int' })
  qty!: number;

  // Snapshot price at order placement time — immutable (BRAIN.md Rule 2)
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unit_price!: number;

  @Column({ type: 'varchar', length: 150 })
  item_name!: string;

  @Column({ type: 'boolean', default: true })
  veg_flag!: boolean;
}
