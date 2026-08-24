import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AppService } from './app.service';

@Controller()
export class AppController {
  private readonly clients: Record<string, ClientProxy>;

  constructor(
    private readonly appService: AppService,
    @Inject('ORDER_SERVICE') private readonly orderClient: ClientProxy,
    @Inject('DISPATCH_SERVICE') private readonly dispatchClient: ClientProxy,
    @Inject('TRACKING_SERVICE') private readonly trackingClient: ClientProxy,
    @Inject('DRIVER_SERVICE') private readonly driverClient: ClientProxy,
  ) {
    this.clients = {
      order: this.orderClient,
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
    const client = this.clients[service];
    if (!client) {
      throw new NotFoundException(`Unknown service: ${service}`);
    }
    return client.send({ cmd: 'health' }, {});
  }
}
