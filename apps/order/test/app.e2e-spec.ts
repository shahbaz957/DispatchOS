import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './../src/order.controller';
import { OrderModule } from './../src/order.module';
import { OutboxRelayService } from './../src/outbox-relay.service';
import { PrismaService } from './../src/prisma.service';

describe('OrderController (e2e)', () => {
  let orderController: OrderController;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [OrderModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
      })
      .overrideProvider('KAFKA_SERVICE')
      .useValue({
        connect: jest.fn(),
        emit: jest.fn(),
      })
      .overrideProvider(OutboxRelayService)
      .useValue({
        onModuleInit: jest.fn(),
      })
      .compile();

    orderController = moduleFixture.get(OrderController);
  });

  it('health', () => {
    expect(orderController.getHealth()).toEqual({
      status: 'ok',
      service: 'order',
    });
  });
});
