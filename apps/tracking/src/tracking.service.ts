import { Injectable } from '@nestjs/common';

@Injectable()
export class TrackingService {
  getHealth() {
    return { status: 'ok', service: 'tracking' };
  }
}
