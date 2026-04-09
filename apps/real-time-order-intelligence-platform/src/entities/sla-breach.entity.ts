import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity('sla_breaches')
export class SlaBreach {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, { nullable: false })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'timestamp' })
  breached_at: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  source_job_id: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
