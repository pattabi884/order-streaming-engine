import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  user_id: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
  })
  email: string;

  @Column({
    type: 'varchar',
    length: 500,
  })
  password_hash: string;

  @Column({
    type: 'varchar',
    length: 20,
  })
  role: string;

  @Column({
    type: 'text',
  })
  name: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}