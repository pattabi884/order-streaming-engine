import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity'; // ✅ type-only import (no runtime circular dependency)

/**
 * ORDERS TABLE
 * ------------
 * This is the core table of the system.
 *
 * Matches SQL exactly:
 * - 3 foreign keys → users
 * - JSONB items
 * - nullable ETA timestamps
 * - auto-managed timestamps
 *
 * IMPORTANT DESIGN NOTES:
 * - We DO NOT define inverse relations (user.orders) → not needed now
 * - We ALWAYS use @JoinColumn to match exact DB column names
 */
@Entity('orders')
export class Order {
  /**
   * PRIMARY KEY
   *
   * SQL:
   * order_id UUID PRIMARY KEY DEFAULT gen_random_uuid()
   *
   * - Generated automatically by Postgres
   * - UUID avoids predictable IDs
   */
  @PrimaryGeneratedColumn('uuid')
  order_id: string;

  // ============================================================
  // RELATIONSHIPS (FOREIGN KEYS → users)
  // ============================================================

  /**
   * CUSTOMER
   *
   * SQL:
   * customer_id UUID NOT NULL REFERENCES users(user_id)
   *
   * Plain English:
   * - Many orders belong to ONE user (customer)
   *
   * nullable: false → required field
   *
   * @JoinColumn:
   * - Forces column name to be exactly "customer_id"
   * - Without this → TypeORM generates garbage names
   */
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  /**
   * MERCHANT
   *
   * SQL:
   * merchant_id UUID NOT NULL REFERENCES users(user_id)
   *
   * - Same pattern as customer
   */
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'merchant_id' })
  merchant: User;

  /**
   * AGENT (nullable)
   *
   * SQL:
   * agent_id UUID REFERENCES users(user_id)
   *
   * IMPORTANT:
   * - nullable: true → no agent at order creation
   * - assigned later in lifecycle
   *
   * TypeScript:
   * - must allow null (User | null)
   */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'agent_id' })
  agent: User | null;

  // ============================================================
  // STATE & MODE
  // ============================================================

  /**
   * ORDER STATE
   *
   * SQL:
   * VARCHAR(25) NOT NULL DEFAULT 'CREATED' CHECK (...)
   *
   * - DB enforces allowed values via CHECK
   * - TypeORM just defines type + default
   */
  @Column({
    type: 'varchar',
    length: 25,
    default: 'CREATED',
  })
  state: string;

  /**
   * FULFILLMENT MODE
   *
   * SQL:
   * VARCHAR(20) NOT NULL DEFAULT 'INSTANT'
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'INSTANT',
  })
  fulfillment_mode: string;

  /**
   * ETA PROVIDER (nullable)
   *
   * Who calculated ETA (internal model, shiprocket, etc.)
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  eta_provider: string | null;

  // ============================================================
  // ETA TIMESTAMPS (ALL NULLABLE)
  // ============================================================

  /**
   * merchant_prep_eta
   *
   * When merchant is expected to finish processing
   *
   * NULL until order is confirmed
   */
  @Column({
    type: 'timestamp',
    nullable: true,
  })
  merchant_prep_eta: Date | null;

  /**
   * delivery_eta
   *
   * When agent is expected to deliver
   *
   * NULL until agent is assigned
   */
  @Column({
    type: 'timestamp',
    nullable: true,
  })
  delivery_eta: Date | null;

  /**
   * expected_delivery_at
   *
   * Final ETA shown to customer
   *
   * = merchant_prep_eta + delivery_eta
   *
   * NULL until both components exist
   */
  @Column({
    type: 'timestamp',
    nullable: true,
  })
  expected_delivery_at: Date | null;

  // ============================================================
  // ORDER DATA
  // ============================================================

  /**
   * ITEMS (JSONB)
   *
   * SQL:
   * items JSONB NOT NULL
   *
   * WHY JSONB:
   * - Always read with order
   * - No need for joins
   * - Stores snapshot of item data
   */
  @Column({
    type: 'jsonb',
  })
  items: Record<string, any>[];

  /**
   * ESTIMATED DELIVERY MINUTES
   *
   * Immutable value set at order creation
   *
   * Used for:
   * - SLA tracking
   * - scheduling background jobs
   */
  @Column({
    type: 'integer',
  })
  estimated_delivery_minutes: number;

  // ============================================================
  // TIMESTAMPS (ORM MANAGED)
  // ============================================================

  /**
   * CREATED_AT
   *
   * Auto-set when row is inserted
   * You NEVER manually set this
   */
  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  /**
   * UPDATED_AT
   *
   * Auto-updated on every save/update
   *
   * THIS solves:
   * - "updated_at not changing" problem
   * - no need to manually set NOW()
   */
  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}