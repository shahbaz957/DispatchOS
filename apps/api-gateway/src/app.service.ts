import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'api-gateway';
  }

  getHealth() {
    return { status: 'ok', service: 'api-gateway' };
  }
}
