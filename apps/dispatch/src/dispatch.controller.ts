import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { DispatchService } from './dispatch.service';

@Controller()
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @MessagePattern({ cmd: 'health' })
  getHealth() {
    return this.dispatchService.getHealth();
  }
}
