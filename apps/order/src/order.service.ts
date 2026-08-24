import { Injectable } from '@nestjs/common';

@Injectable()
export class OrderService {
  getHealth() {
    return { status: 'ok', service: 'order' };
  }
}
