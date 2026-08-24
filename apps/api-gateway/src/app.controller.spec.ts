import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const mockClient = { send: jest.fn() };
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: 'ORDER_SERVICE', useValue: mockClient },
        { provide: 'DISPATCH_SERVICE', useValue: mockClient },
        { provide: 'TRACKING_SERVICE', useValue: mockClient },
        { provide: 'DRIVER_SERVICE', useValue: mockClient },
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
