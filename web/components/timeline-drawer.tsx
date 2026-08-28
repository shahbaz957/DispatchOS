"use client";

import { StatusBadge } from "@/components/status-badge";
import { formatTime, shortId } from "@/lib/format";
import type { Order, TimelineEvent } from "@/lib/types";

type Props = {
  order: Order;
  events: TimelineEvent[];
  onClose: () => void;
};

export function TimelineDrawer({ order, events, onClose }: Props) {
  return (
    <>
      <button className="drawer-backdrop" aria-label="Close timeline" onClick={onClose} />
      <aside className="drawer">
        <div className="panel-head" style={{ padding: 0, border: 0 }}>
          <div>
            <div className="brand-kicker">Tracking</div>
            <h2>Order {shortId(order.id)}</h2>
            <p>{order.merchantId} · {order.status.replaceAll("_", " ")}</p>
          </div>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="timeline">
          {events.length === 0 ? (
            <p className="empty">No timeline events yet. Tracking writes as Kafka events arrive.</p>
          ) : (
            events.map((event) => (
              <div className="timeline-item" key={event.id}>
                <StatusBadge value={event.eventType} />
                <div className="mono" style={{ marginTop: 6, color: "var(--text-muted)" }}>
                  {formatTime(event.occurredAt)}
                  {event.driverId ? ` · driver ${shortId(event.driverId)}` : ""}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
