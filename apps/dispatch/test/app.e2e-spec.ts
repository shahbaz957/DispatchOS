import { Test, TestingModule } from '@nestjs/testing';
import { DispatchController } from './../src/dispatch.controller';
import { DispatchModule } from './../src/dispatch.module';
import { PrismaService } from './../src/prisma.service';
import { REDIS_CLIENT } from './../src/redis.provider';

describe('DispatchController (e2e)', () => {
  let dispatchController: DispatchController;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DispatchModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        assignment: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      })
      .overrideProvider(REDIS_CLIENT)
      .useValue({
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        call: jest.fn(),
        quit: jest.fn(),
      })
      .overrideProvider('KAFKA_SERVICE')
      .useValue({
        connect: jest.fn(),
        emit: jest.fn(),
      })
      .compile();

    dispatchController = moduleFixture.get(DispatchController);
  });

  it('health', () => {
    expect(dispatchController.getHealth()).toEqual({
      status: 'ok',
      service: 'dispatch',
    });
  });
});
