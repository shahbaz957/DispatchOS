import { Module } from '@nestjs/common';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';

@Module({
  imports: [],
  controllers: [TrackingController],
  providers: [TrackingService],
})
export class TrackingModule {}
