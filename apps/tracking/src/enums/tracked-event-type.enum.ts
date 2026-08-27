export const TRACKED_EVENT_TYPES = [
  'order.created',
  'ASSIGNMENT_OFFERED',
  'ASSIGNMENT_ACCEPTED',
  'ASSIGNMENT_REJECTED',
  'ASSIGNMENT_TIMEOUT',
  'ORDER_COMPLETED',
  'ORDER_CANCELLED',
] as const;

export type TrackedEventType = (typeof TRACKED_EVENT_TYPES)[number];
