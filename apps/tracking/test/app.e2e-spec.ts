import { Test, TestingModule } from '@nestjs/testing';
import { TrackingController } from './../src/tracking.controller';
import { TrackingModule } from './../src/tracking.module';

describe('TrackingController (e2e)', () => {
  let trackingController: TrackingController;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TrackingModule],
    }).compile();

    trackingController = moduleFixture.get(TrackingController);
  });

  it('health', () => {
    expect(trackingController.getHealth()).toEqual({
      status: 'ok',
      service: 'tracking',
    });
  });
});
