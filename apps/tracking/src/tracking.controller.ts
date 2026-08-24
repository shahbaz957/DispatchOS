import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { TrackingService } from './tracking.service';

@Controller()
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @MessagePattern({ cmd: 'health' })
  getHealth() {
    return this.trackingService.getHealth();
  }
}
