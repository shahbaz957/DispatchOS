import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { PrismaService } from './prisma.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [TrackingController],
  providers: [TrackingService, PrismaService],
})
export class TrackingModule {}
