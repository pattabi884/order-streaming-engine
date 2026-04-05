import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SelectQueryBuilder, Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { KafkaProducerService } from '@app/kafka/kafka-producer.service';
import { OrderCreatedSchema } from '@app/schemas/order.schema';

import { CreateOrderDto } from '../auth/dto/create-order.dto';
import { Order } from '../entities/order.entity';

type AuthenticatedUser = {
  user_id: string;
  role: string;
  email?: string;
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly kafkaProducer: KafkaProducerService,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async createOrder(dto: CreateOrderDto, customerId: string) {
    const event = {
      eventType: 'CREATED',
      orderId: randomUUID(),
      merchantId: dto.merchantId,
      customerId,
      items: dto.items,
      estimatedDeliveryMinutes: dto.estimatedDeliveryMinutes,
      timestamp: Date.now(),
    };

    const result = OrderCreatedSchema.safeParse(event);
    if (!result.success) {
      console.error('invalid event', result.error);
      throw new Error('invalid event structure');
    }

    await this.kafkaProducer.publish(
      'order.lifecycle',
      event.orderId, // partition key keeps order events ordered per order
      event,
    );

    return {
      orderId: event.orderId,
      status: 'accepted',
    };
  }

  async listForUser(user: AuthenticatedUser): Promise<Order[]> {
    const qb = this.createScopedQuery(user).orderBy('order.created_at', 'DESC');
    return qb.getMany();
  }

  async getOneForUser(orderId: string, user: AuthenticatedUser): Promise<Order> {
    const order = await this.createScopedQuery(user)
      .andWhere('order.order_id = :orderId', { orderId })
      .getOne();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  private createScopedQuery(user: AuthenticatedUser): SelectQueryBuilder<Order> {
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoin('order.customer', 'customer')
      .leftJoin('order.merchant', 'merchant')
      .leftJoin('order.agent', 'agent');

    this.applyRoleScope(qb, user);
    return qb;
  }

  private applyRoleScope(
    qb: SelectQueryBuilder<Order>,
    user: AuthenticatedUser,
  ): void {
    switch (user.role) {
      case 'CUSTOMER':
        qb.andWhere('customer.user_id = :userId', { userId: user.user_id });
        return;

      case 'MERCHANT':
        qb.andWhere('merchant.user_id = :userId', { userId: user.user_id });
        return;

      case 'AGENT':
        qb.andWhere('agent.user_id = :userId', { userId: user.user_id });
        return;

      case 'OPS_ADMIN':
        return;

      default:
        throw new ForbiddenException('Role is not allowed to access orders');
    }
  }
}
