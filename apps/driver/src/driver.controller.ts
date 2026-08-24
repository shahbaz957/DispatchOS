import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { DriverService } from './driver.service';

@Controller()
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @MessagePattern({ cmd: 'health' })
  getHealth() {
    return this.driverService.getHealth();
  }
}
