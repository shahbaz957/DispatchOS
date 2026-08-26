import { OrderStatus } from '../generated/prisma';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  assignedDriverId?: string;
}
