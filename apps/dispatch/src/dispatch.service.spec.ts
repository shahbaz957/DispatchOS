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
