import { Module } from '@nestjs/common';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';

@Module({
  imports: [],
  controllers: [DispatchController],
  providers: [DispatchService],
})
export class DispatchModule {}
