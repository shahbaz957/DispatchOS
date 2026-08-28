import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DispatchHttpService } from './dispatch-http.service';
import { DriverHttpService } from './driver-http.service';
import { OrderHttpService } from './order-http.service';
import { TrackingHttpService } from './tracking-http.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: OrderHttpService,
          useValue: { health: jest.fn(), findAll: jest.fn(), createOrder: jest.fn() },
        },
        {
          provide: DriverHttpService,
          useValue: { health: jest.fn(), findAll: jest.fn() },
        },
        {
          provide: DispatchHttpService,
          useValue: { health: jest.fn(), findAll: jest.fn() },
        },
        {
          provide: TrackingHttpService,
          useValue: { health: jest.fn(), getTimeline: jest.fn() },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "api-gateway"', () => {
      expect(appController.getHello()).toBe('api-gateway');
    });
  });
});
