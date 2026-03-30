import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity('order_state_history')
export class OrderStateHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, { nullable: false })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  /**
   * Nullable because the first transition
   * (creation) has no previous state
   */
  @Column({
    type: 'varchar',
    length: 25,
    nullable: true,
  })
  from_state: string | null;

  @Column({
    type: 'varchar',
    length: 25,
  })
  to_state: string;

  @CreateDateColumn({ type: 'timestamp' })
  changed_at: Date;
}