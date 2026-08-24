import { Test, TestingModule } from '@nestjs/testing';
import { DispatchController } from './../src/dispatch.controller';
import { DispatchModule } from './../src/dispatch.module';

describe('DispatchController (e2e)', () => {
  let dispatchController: DispatchController;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DispatchModule],
    }).compile();

    dispatchController = moduleFixture.get(DispatchController);
  });

  it('health', () => {
    expect(dispatchController.getHealth()).toEqual({
      status: 'ok',
      service: 'dispatch',
    });
  });
});
