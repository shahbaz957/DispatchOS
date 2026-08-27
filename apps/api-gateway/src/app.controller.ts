import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AppService } from './app.service';
import { DispatchHttpService } from './dispatch-http.service';
import { DriverHttpService } from './driver-http.service';
import { OrderHttpService } from './order-http.service';

@Controller()
export class AppController {
  private readonly clients: Record<string, ClientProxy>;

  constructor(
    private readonly appService: AppService,
    private readonly orderHttp: OrderHttpService,
    private readonly driverHttp: DriverHttpService,
    private readonly dispatchHttp: DispatchHttpService,
    @Inject('TRACKING_SERVICE') private readonly trackingClient: ClientProxy,
  ) {
    this.clients = {
      tracking: this.trackingClient,
    };
  }

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
    const client = this.clients[service];
    if (!client) {
      throw new NotFoundException(`Unknown service: ${service}`);
    }
    return client.send({ cmd: 'health' }, {});
  }

  @Post('orders')
  createOrder(@Body() body: unknown) {
    return this.orderHttp.createOrder(body);
  }

  @Patch('orders/:id/status')
  updateOrderStatus(@Param('id') id: string, @Body() body: unknown) {
    return this.orderHttp.updateStatus(id, body);
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
