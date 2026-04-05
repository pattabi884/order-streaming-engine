import { IsString, IsArray, IsInt, IsOptional } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  merchantId: string;

  @IsArray()
  items: any[];

  @IsInt()
  estimatedDeliveryMinutes: number;
}