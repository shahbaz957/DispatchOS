import { Module } from '@nestjs/common';
import { DriverController } from './driver.controller';
import { DriverService } from './driver.service';

@Module({
  imports: [],
  controllers: [DriverController],
  providers: [DriverService],
})
export class DriverModule {}
