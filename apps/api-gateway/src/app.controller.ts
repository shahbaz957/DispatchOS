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
import { OrderHttpService } from './order-http.service';

@Controller()
export class AppController {
  private readonly clients: Record<string, ClientProxy>;

  constructor(
    private readonly appService: AppService,
    private readonly orderHttp: OrderHttpService,
    @Inject('DISPATCH_SERVICE') private readonly dispatchClient: ClientProxy,
    @Inject('TRACKING_SERVICE') private readonly trackingClient: ClientProxy,
    @Inject('DRIVER_SERVICE') private readonly driverClient: ClientProxy,
  ) {
    this.clients = {
      dispatch: this.dispatchClient,
      tracking: this.trackingClient,
      driver: this.driverClient,
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
}
