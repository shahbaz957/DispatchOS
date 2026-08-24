import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

describe('OrderController', () => {
  let orderController: OrderController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [OrderService],
    }).compile();

    orderController = app.get<OrderController>(OrderController);
  });

  describe('health', () => {
    it('should return order health', () => {
      expect(orderController.getHealth()).toEqual({
        status: 'ok',
        service: 'order',
      });
    });
  });
});
