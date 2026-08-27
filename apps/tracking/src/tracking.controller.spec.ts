import { Test, TestingModule } from '@nestjs/testing';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';

describe('TrackingController', () => {
  let trackingController: TrackingController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [TrackingController],
      providers: [
        {
          provide: TrackingService,
          useValue: {
            getHealth: () => ({ status: 'ok', service: 'tracking' }),
            findByOrderId: jest.fn(),
            recordOrderCreated: jest.fn(),
            recordEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    trackingController = app.get<TrackingController>(TrackingController);
  });

  describe('health', () => {
    it('should return tracking health', () => {
      expect(trackingController.getHealth()).toEqual({
        status: 'ok',
        service: 'tracking',
      });
    });
  });
});
