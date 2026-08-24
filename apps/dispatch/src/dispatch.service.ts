import { Injectable } from '@nestjs/common';

@Injectable()
export class DispatchService {
  getHealth() {
    return { status: 'ok', service: 'dispatch' };
  }
}
