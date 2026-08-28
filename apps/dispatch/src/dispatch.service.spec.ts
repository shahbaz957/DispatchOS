import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { DispatchService } from './dispatch.service';
import { AssignmentStatus } from './generated/prisma';
import { PrismaService } from './prisma.service';
import { REDIS_CLIENT } from './redis.provider';

describe('DispatchService', () => {
  let service: DispatchService;
  const prisma = {
    assignment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const redis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    call: jest.fn(),
    quit: jest.fn(),
  };
  const kafka = {
    connect: jest.fn(),
    emit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    kafka.emit.mockReturnValue(of(undefined));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispatchService,
        { provide: PrismaService, useValue: prisma },
        { provide: REDIS_CLIENT, useValue: redis },
        { provide: 'KAFKA_SERVICE', useValue: kafka },
      ],
    }).compile();

    service = module.get(DispatchService);
  });

  it('skips order.created when an assignment already exists', async () => {
    prisma.assignment.findFirst.mockResolvedValue({ id: 'a1' });

    await service.handleOrderCreated({
      id: '11111111-1111-1111-1111-111111111111',
      latitude: 24.86,
      longitude: 67.0,
    });

    expect(redis.call).not.toHaveBeenCalled();
  });

  it('offers the nearest driver beyond 5 km when nobody is inside the radius', async () => {
    prisma.assignment.findFirst.mockResolvedValue(null);
    prisma.assignment.findMany.mockResolvedValue([]);
    redis.call
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(['22222222-2222-2222-2222-222222222222']);
    redis.get.mockResolvedValue('AVAILABLE');
    redis.set.mockResolvedValue('OK');
    prisma.assignment.create.mockResolvedValue({ id: 'a1' });

    await service.handleOrderCreated({
      id: '11111111-1111-1111-1111-111111111111',
      latitude: 25.87,
      longitude: 69.0,
    });

    expect(redis.call).toHaveBeenCalledTimes(2);
    expect(prisma.assignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          driverId: '22222222-2222-2222-2222-222222222222',
        }),
      }),
    );
  });

  it('retries when a new driver comes online after prior rejections', async () => {
    const orderId = '11111111-1111-1111-1111-111111111111';
    const newDriverId = '33333333-3333-3333-3333-333333333333';

    prisma.assignment.findMany
      .mockResolvedValueOnce([
        {
          orderId,
          status: AssignmentStatus.REJECTED,
          latitude: 24.86,
          longitude: 67.0,
        },
        {
          orderId,
          status: AssignmentStatus.REJECTED,
          latitude: 24.86,
          longitude: 67.0,
        },
      ])
      .mockResolvedValueOnce([
        { driverId: '11111111-1111-1111-1111-111111111111' },
        { driverId: '22222222-2222-2222-2222-222222222222' },
      ])
      .mockResolvedValueOnce([
        { driverId: '11111111-1111-1111-1111-111111111111' },
        { driverId: '22222222-2222-2222-2222-222222222222' },
      ]);

    prisma.assignment.findFirst.mockResolvedValue({ attempt: 2 });
    redis.call
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([newDriverId])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([newDriverId]);
    redis.get.mockResolvedValue('AVAILABLE');
    redis.set.mockResolvedValue('OK');
    prisma.assignment.create.mockResolvedValue({ id: 'a3' });

    await service.retryPendingOrders();

    expect(prisma.assignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId,
          driverId: newDriverId,
          attempt: 3,
        }),
      }),
    );
  });

  it('cancels a confirmed assignment without offering another driver', async () => {
    prisma.assignment.findFirst.mockResolvedValue({
      id: 'a1',
      attempt: 1,
      status: AssignmentStatus.CONFIRMED,
    });
    prisma.assignment.update.mockResolvedValue({});
    prisma.assignment.findMany.mockResolvedValue([]);

    await service.handleDriverEvent({
      eventType: 'ORDER_CANCELLED',
      driverId: '22222222-2222-2222-2222-222222222222',
      orderId: '11111111-1111-1111-1111-111111111111',
    });

    expect(prisma.assignment.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { status: AssignmentStatus.CANCELLED },
    });
    expect(redis.del).toHaveBeenCalledWith(
      'lock:driver:22222222-2222-2222-2222-222222222222',
    );
    expect(redis.call).not.toHaveBeenCalled();
  });
});
