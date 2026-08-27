import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus } from './generated/prisma';
import { OrderService } from './order.service';
import { PrismaService } from './prisma.service';

describe('OrderService', () => {
  let service: OrderService;
  const prisma = {
    order: {
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get(OrderService);
  });

  it.each([
    ['ASSIGNMENT_OFFERED', OrderStatus.OFFERED],
    ['ASSIGNMENT_CONFIRMED', OrderStatus.ASSIGNED],
    ['ASSIGNMENT_COMPLETED', OrderStatus.COMPLETED],
    ['ASSIGNMENT_CANCELLED', OrderStatus.CANCELLED],
  ])('maps %s to %s', async (eventType, status) => {
    prisma.order.update.mockResolvedValue({});

    await service.handleDispatchEvent({
      eventType,
      orderId: '11111111-1111-1111-1111-111111111111',
      driverId: '22222222-2222-2222-2222-222222222222',
    });

    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: '11111111-1111-1111-1111-111111111111' },
      data: {
        status,
        assignedDriverId: '22222222-2222-2222-2222-222222222222',
      },
    });
  });

  it('ignores dispatch events that do not change order status', async () => {
    await service.handleDispatchEvent({
      eventType: 'ASSIGNMENT_TIMEOUT',
      orderId: '11111111-1111-1111-1111-111111111111',
    });

    expect(prisma.order.update).not.toHaveBeenCalled();
  });
});
