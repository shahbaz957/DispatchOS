import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { DispatchOrderEvent, OrderService } from './order.service';

@Controller()
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get('health')
  getHealth() {
    return this.orderService.getHealth();
  }

  @Post('orders')
  create(@Body() dto: CreateOrderDto) {
    return this.orderService.create(dto);
  }

  @Patch('orders/:id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateStatus(id, dto);
  }

  @EventPattern('dispatch.events')
  handleDispatchEvents(@Payload() event: DispatchOrderEvent) {
    return this.orderService.handleDispatchEvent(event);
  }
}
