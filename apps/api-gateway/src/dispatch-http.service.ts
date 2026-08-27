import {
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DispatchHttpService {
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>(
      'DISPATCH_SERVICE_URL',
      'http://127.0.0.1:3002',
    );
  }

  health() {
    return this.request('/health');
  }

  findAll() {
    return this.request('/assignments');
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
      throw new ServiceUnavailableException('Dispatch service is unavailable');
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new HttpException(payload, response.status);
    }
    return payload;
  }
}
