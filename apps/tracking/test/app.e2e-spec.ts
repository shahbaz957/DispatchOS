import { Test, TestingModule } from '@nestjs/testing';
import { TrackingController } from './../src/tracking.controller';
import { TrackingModule } from './../src/tracking.module';
import { PrismaService } from './../src/prisma.service';

describe('TrackingController (e2e)', () => {
  let trackingController: TrackingController;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TrackingModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        orderTimeline: {
          findMany: jest.fn().mockResolvedValue([]),
          create: jest.fn(),
        },
      })
      .compile();

    trackingController = moduleFixture.get(TrackingController);
  });

  it('health', () => {
    expect(trackingController.getHealth()).toEqual({
      status: 'ok',
      service: 'tracking',
    });
  });
});
