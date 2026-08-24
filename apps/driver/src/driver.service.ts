import { Injectable } from '@nestjs/common';

@Injectable()
export class DriverService {
  getHealth() {
    return { status: 'ok', service: 'driver' };
  }
}
