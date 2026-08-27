import { Test, TestingModule } from '@nestjs/testing';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';

describe('DispatchController', () => {
  let dispatchController: DispatchController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [DispatchController],
      providers: [
        {
          provide: DispatchService,
          useValue: {
            getHealth: () => ({ status: 'ok', service: 'dispatch' }),
            findAll: jest.fn(),
            handleOrderCreated: jest.fn(),
            handleDriverEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    dispatchController = app.get<DispatchController>(DispatchController);
  });

  describe('health', () => {
    it('should return dispatch health', () => {
      expect(dispatchController.getHealth()).toEqual({
        status: 'ok',
        service: 'dispatch',
      });
    });
  });
});
