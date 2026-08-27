import { Prisma } from './generated/prisma';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';
import { TrackingService } from './tracking.service';

describe('TrackingService', () => {
  let service: TrackingService;
  const prisma = {
    orderTimeline: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(TrackingService);
  });

  it('records order.created using the order id', async () => {
    prisma.orderTimeline.create.mockResolvedValue({});

    await service.recordOrderCreated({
      id: '11111111-1111-1111-1111-111111111111',
      createdAt: '2026-08-27T19:00:00.000Z',
    });

    expect(prisma.orderTimeline.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: '11111111-1111-1111-1111-111111111111',
        eventId: 'order.created:11111111-1111-1111-1111-111111111111',
        eventType: 'order.created',
        driverId: null,
      }),
    });
  });

  it('skips untracked event types', async () => {
    await service.recordEvent({
      eventType: 'DRIVER_STATUS_CHANGED',
      orderId: '11111111-1111-1111-1111-111111111111',
      driverId: '22222222-2222-2222-2222-222222222222',
    });

    expect(prisma.orderTimeline.create).not.toHaveBeenCalled();
  });

  it('skips duplicate Kafka deliveries', async () => {
    prisma.orderTimeline.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '6.16.2',
      }),
    );

    await expect(
      service.recordEvent({
        eventType: 'ASSIGNMENT_OFFERED',
        orderId: '11111111-1111-1111-1111-111111111111',
        driverId: '22222222-2222-2222-2222-222222222222',
        assignmentId: '33333333-3333-3333-3333-333333333333',
        timestamp: '2026-08-27T19:00:00.000Z',
      }),
    ).resolves.toBeUndefined();
  });
});
