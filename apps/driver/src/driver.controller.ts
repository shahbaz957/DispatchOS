import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import {
  DriverStatus,
  UpdateDriverStatusDto,
} from './dto/update-driver-status.dto';
import { DriverService } from './driver.service';

@Controller()
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Get('health')
  getHealth() {
    return this.driverService.getHealth();
  }

  @Get('drivers')
  findAll() {
    return this.driverService.findAll();
  }

  @Patch('drivers/:id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDriverStatusDto,
  ) {
    return this.driverService.updateStatus(id, dto);
  }

  @EventPattern('dispatch.events')
  async handleDispatchEvents(
    @Payload() event: { eventType?: string; driverId?: string },
  ) {
    if (!event?.eventType || !event?.driverId) {
      return;
    }

    if (event.eventType === 'ASSIGNMENT_OFFERED') {
      await this.driverService.handleDispatchOfferChange(
        event.driverId,
        DriverStatus.OFFERED,
      );
    } else if (event.eventType === 'ASSIGNMENT_TIMEOUT') {
      await this.driverService.handleDispatchOfferChange(
        event.driverId,
        DriverStatus.AVAILABLE,
      );
    }
  }
}
