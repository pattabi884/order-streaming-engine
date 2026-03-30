import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('agents')
export class Agent {
  @PrimaryColumn({ type: 'uuid' })
  user_id: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'OFFLINE',
  })
  status: string;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  current_lat: number | null;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  current_lng: number | null;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  last_location_at: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}