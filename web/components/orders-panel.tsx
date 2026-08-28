"use client";

import { StatusBadge } from "@/components/status-badge";
import { formatCoords, formatTime, shortId } from "@/lib/format";
import type { Driver, Order } from "@/lib/types";

type FormState = {
  merchantId: string;
  latitude: string;
  longitude: string;
};

type Props = {
  orders: Order[];
  drivers: Driver[];
  form: FormState;
  creating: boolean;
  onFormChange: (form: FormState) => void;
  onCreate: () => void;
  onShuffleMerchant: () => void;
  onKarachi: () => void;
  onRetry: (order: Order) => void;
  onOpenTimeline: (order: Order) => void;
};

export function OrdersPanel({
  orders,
  drivers,
  form,
  creating,
  onFormChange,
  onCreate,
  onShuffleMerchant,
  onKarachi,
  onRetry,
  onOpenTimeline,
}: Props) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Order simulation</h2>
          <p>Create a pickup. Dispatch matches nearby available drivers. Status is updated by events.</p>
        </div>
        <span className="live">
          <span className="live-dot" />
          {orders.length} orders
        </span>
      </div>
      <div className="panel-body">
        <div className="form-row">
          <label className="field">
            Merchant
            <input
              value={form.merchantId}
              onChange={(event) =>
                onFormChange({ ...form, merchantId: event.target.value })
              }
            />
          </label>
          <label className="field">
            Latitude
            <input
              value={form.latitude}
              onChange={(event) =>
                onFormChange({ ...form, latitude: event.target.value })
              }
            />
          </label>
          <label className="field">
            Longitude
            <input
              value={form.longitude}
              onChange={(event) =>
                onFormChange({ ...form, longitude: event.target.value })
              }
            />
          </label>
          <label className="field">
            Create
            <div className="actions">
              <button className="btn btn-ghost" type="button" onClick={onShuffleMerchant}>
                New merchant
              </button>
              <button className="btn btn-ghost" type="button" onClick={onKarachi}>
                Karachi
              </button>
              <button className="btn btn-primary" type="button" disabled={creating} onClick={onCreate}>
                Place order
              </button>
            </div>
          </label>
        </div>
        <div className="table-wrap">
          {orders.length === 0 ? (
            <p className="empty">No orders yet. Place one to start dispatch.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Merchant</th>
                  <th>Status</th>
                  <th>Driver</th>
                  <th>Pickup</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const driver = drivers.find((row) => row.id === order.assignedDriverId);
                  return (
                    <tr key={order.id}>
                      <td className="mono">
                        {shortId(order.id)}
                        <div style={{ color: "var(--text-faint)" }}>
                          {order.clientOrderId ?? formatTime(order.createdAt)}
                        </div>
                      </td>
                      <td className="mono">{order.merchantId}</td>
                      <td>
                        <StatusBadge value={order.status} />
                      </td>
                      <td>{driver?.name ?? (order.assignedDriverId ? shortId(order.assignedDriverId) : "—")}</td>
                      <td className="mono">{formatCoords(order.latitude, order.longitude)}</td>
                      <td>
                        <div className="actions">
                          <button className="btn btn-ghost" onClick={() => onOpenTimeline(order)}>
                            Timeline
                          </button>
                          {order.status === "CANCELLED" && (
                            <button className="btn" onClick={() => onRetry(order)}>
                              Retry as new
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
