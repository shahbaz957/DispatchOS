import { Test, TestingModule } from '@nestjs/testing';
import { DriverController } from './../src/driver.controller';
import { DriverModule } from './../src/driver.module';

describe('DriverController (e2e)', () => {
  let driverController: DriverController;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DriverModule],
    }).compile();

    driverController = moduleFixture.get(DriverController);
  });

  it('health', () => {
    expect(driverController.getHealth()).toEqual({
      status: 'ok',
      service: 'driver',
    });
  });
});
