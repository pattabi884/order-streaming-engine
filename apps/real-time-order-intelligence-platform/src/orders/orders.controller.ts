import { Controller, Post, Body } from '@nestjs/common';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * POST /orders
   */
  @Post()
  async create(@Body() body: any) {
    /**
     * In real app:
     * use DTO + ValidationPipe
     */
    return this.ordersService.createOrder(body);
  }
}