import {
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrderHttpService {
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>(
      'ORDER_SERVICE_URL',
      'http://127.0.0.1:3001',
    );
  }

  health() {
    return this.request('/health');
  }

  findAll() {
    return this.request('/orders');
  }

  createOrder(body: unknown) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  updateStatus(id: string, body: unknown) {
    return this.request(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  private async request(path: string, init?: RequestInit) {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          'content-type': 'application/json',
          ...(init?.headers ?? {}),
        },
      });
    } catch {
      throw new ServiceUnavailableException('Order service is unavailable');
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new HttpException(payload, response.status);
    }
    return payload;
  }
}
