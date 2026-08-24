import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './../src/order.controller';
import { OrderModule } from './../src/order.module';

describe('OrderController (e2e)', () => {
  let orderController: OrderController;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [OrderModule],
    }).compile();

    orderController = moduleFixture.get(OrderController);
  });

  it('health', () => {
    expect(orderController.getHealth()).toEqual({
      status: 'ok',
      service: 'order',
    });
  });
});
