import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { IncomingEvent, TrackingService } from './tracking.service';

@Controller()
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get('health')
  getHealth() {
    return this.trackingService.getHealth();
  }

  @Get('orders/:id/timeline')
  findByOrderId(@Param('id', ParseUUIDPipe) id: string) {
    return this.trackingService.findByOrderId(id);
  }

  @EventPattern('order.created')
  handleOrderCreated(@Payload() event: IncomingEvent) {
    return this.trackingService.recordOrderCreated(event ?? {});
  }

  @EventPattern('dispatch.events')
  handleDispatchEvents(@Payload() event: IncomingEvent) {
    return this.trackingService.recordEvent(event ?? {});
  }

  @EventPattern('driver.events')
  handleDriverEvents(@Payload() event: IncomingEvent) {
    return this.trackingService.recordEvent(event ?? {});
  }
}
