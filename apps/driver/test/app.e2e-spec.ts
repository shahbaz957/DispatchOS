import { Test, TestingModule } from '@nestjs/testing';
import { DriverController } from './../src/driver.controller';
import { DriverModule } from './../src/driver.module';
import { PrismaService } from './../src/prisma.service';
import { REDIS_CLIENT } from './../src/redis.provider';

describe('DriverController (e2e)', () => {
  let driverController: DriverController;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DriverModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
      })
      .overrideProvider(REDIS_CLIENT)
      .useValue({
        set: jest.fn(),
        geoadd: jest.fn(),
        zrem: jest.fn(),
        quit: jest.fn(),
      })
      .overrideProvider('KAFKA_SERVICE')
      .useValue({
        connect: jest.fn(),
        emit: jest.fn(),
      })
      .compile();

    driverController = moduleFixture.get(DriverController);
  });

  it('health', () => {
    expect(driverController.getHealth()).toEqual({
      status: 'ok',
      service: 'driver',
    });
  });
});
