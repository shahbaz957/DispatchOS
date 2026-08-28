export type DriverStatus = 'OFFLINE' | 'AVAILABLE' | 'OFFERED' | 'BUSY';
export type OrderStatus =
  | 'PENDING_DISPATCH'
  | 'OFFERED'
  | 'ASSIGNED'
  | 'COMPLETED'
  | 'CANCELLED';
export type AssignmentStatus =
  | 'OFFERED'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'COMPLETED';
export type DriverAction = 'ACCEPT' | 'DECLINE' | 'COMPLETE' | 'CANCEL';

export type Driver = {
  id: string;
  name: string;
  status: DriverStatus;
  lastLat: number | null;
  lastLng: number | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Order = {
  id: string;
  merchantId: string;
  clientOrderId: string | null;
  status: OrderStatus;
  latitude: number;
  longitude: number;
  assignedDriverId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Assignment = {
  id: string;
  orderId: string;
  driverId: string;
  status: AssignmentStatus;
  attempt: number;
  latitude: number;
  longitude: number;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

export type TimelineEvent = {
  id: string;
  orderId: string;
  eventId: string;
  eventType: string;
  driverId: string | null;
  payload: unknown;
  occurredAt: string;
  createdAt: string;
};

export type CreateOrderBody = {
  merchantId: string;
  latitude: number;
  longitude: number;
  clientOrderId?: string;
};

export type UpdateDriverStatusBody = {
  status: DriverStatus;
  action?: DriverAction;
  orderId?: string;
  latitude?: number;
  longitude?: number;
};
