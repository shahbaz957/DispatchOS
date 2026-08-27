import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DispatchHttpService } from './dispatch-http.service';
import { DriverHttpService } from './driver-http.service';
import { OrderHttpService } from './order-http.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ClientsModule.register([
      {
        name: 'TRACKING_SERVICE',
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: 3003 },
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    OrderHttpService,
    DriverHttpService,
    DispatchHttpService,
  ],
})
export class AppModule {}
