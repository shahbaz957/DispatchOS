import { Controller, Get } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import {
  DispatchService,
  DriverLifecycleEvent,
  OrderCreatedEvent,
} from './dispatch.service';

@Controller()
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Get('health')
  getHealth() {
    return this.dispatchService.getHealth();
  }

  @Get('assignments')
  findAll() {
    return this.dispatchService.findAll();
  }

  @EventPattern('order.created')
  handleOrderCreated(@Payload() event: OrderCreatedEvent) {
    return this.dispatchService.handleOrderCreated(event);
  }

  @EventPattern('driver.events')
  handleDriverEvents(@Payload() event: DriverLifecycleEvent) {
    return this.dispatchService.handleDriverEvent(event);
  }
}
