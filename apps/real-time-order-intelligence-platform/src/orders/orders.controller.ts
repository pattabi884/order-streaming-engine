import { Controller, Post, Body, UseGuards, Get, Param } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateOrderDto } from '../auth/dto/create-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * POST /orders
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  async create(@Body() body: CreateOrderDto, @CurrentUser() user: any) {
    
    return this.ordersService.createOrder(body, user.user_id);
  }


@Get()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CUSTOMER', 'MERCHANT', 'AGENT', 'OPS_ADMIN')
async list(@CurrentUser() user: any) {
  return this.ordersService.listForUser(user);
}

@Get(':id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CUSTOMER', 'MERCHANT', 'AGENT', 'OPS_ADMIN')
async getOne(@Param('id') id: string, @CurrentUser() user: any) {
  return this.ordersService.getOneForUser(id, user);
}


}