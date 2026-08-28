import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AppService } from './app.service';
import { DispatchHttpService } from './dispatch-http.service';
import { DriverHttpService } from './driver-http.service';
import { OrderHttpService } from './order-http.service';
import { TrackingHttpService } from './tracking-http.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly orderHttp: OrderHttpService,
    private readonly driverHttp: DriverHttpService,
    private readonly dispatchHttp: DispatchHttpService,
    private readonly trackingHttp: TrackingHttpService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('health/:service')
  pingService(@Param('service') service: string) {
    if (service === 'order') {
      return this.orderHttp.health();
    }
    if (service === 'driver') {
      return this.driverHttp.health();
    }
    if (service === 'dispatch') {
      return this.dispatchHttp.health();
    }
    if (service === 'tracking') {
      return this.trackingHttp.health();
    }
    throw new NotFoundException(`Unknown service: ${service}`);
  }

  @Get('orders')
  findOrders() {
    return this.orderHttp.findAll();
  }

  @Post('orders')
  createOrder(@Body() body: unknown) {
    return this.orderHttp.createOrder(body);
  }

  @Patch('orders/:id/status')
  updateOrderStatus(@Param('id') id: string, @Body() body: unknown) {
    return this.orderHttp.updateStatus(id, body);
  }

  @Get('orders/:id/timeline')
  getOrderTimeline(@Param('id') id: string) {
    return this.trackingHttp.getTimeline(id);
  }

  @Get('assignments')
  findAssignments() {
    return this.dispatchHttp.findAll();
  }

  @Get('drivers')
  findDrivers() {
    return this.driverHttp.findAll();
  }

  @Patch('drivers/:id/status')
  updateDriverStatus(@Param('id') id: string, @Body() body: unknown) {
    return this.driverHttp.updateStatus(id, body);
  }
}
