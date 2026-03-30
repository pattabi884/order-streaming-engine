import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('merchants')
export class Merchant {
  @PrimaryColumn({ type: 'uuid' })
  user_id: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'text',
  })
  display_name: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  business_type: string | null;

  @Column({
    type: 'text',
  })
  address: string;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  lat: number | null;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  lng: number | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}