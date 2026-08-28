import type {
  Assignment,
  CreateOrderBody,
  Driver,
  Order,
  TimelineEvent,
  UpdateDriverStatusBody,
} from './types';

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(readError(payload, response.status));
  }
  return payload as T;
}

function readError(payload: unknown, status: number) {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message: unknown }).message;
    if (typeof message === 'string') {
      return message;
    }
    if (Array.isArray(message)) {
      return message.join(', ');
    }
  }
  return `Request failed (${status})`;
}

export const api = {
  health: () => request<{ status: string; service: string }>('/health'),
  healthService: (service: string) =>
    request<{ status: string; service: string }>(`/health/${service}`),
  listDrivers: () => request<Driver[]>('/drivers'),
  updateDriverStatus: (id: string, body: UpdateDriverStatusBody) =>
    request<Driver>(`/drivers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  listOrders: () => request<Order[]>('/orders'),
  createOrder: (body: CreateOrderBody) =>
    request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  listAssignments: () => request<Assignment[]>('/assignments'),
  getTimeline: (orderId: string) =>
    request<TimelineEvent[]>(`/orders/${orderId}/timeline`),
};
