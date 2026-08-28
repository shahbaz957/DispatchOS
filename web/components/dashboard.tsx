"use client";

import { useCallback, useEffect, useState } from "react";
import { DriversPanel, activeAssignment } from "@/components/drivers-panel";
import { OrdersPanel } from "@/components/orders-panel";
import { TimelineDrawer } from "@/components/timeline-drawer";
import { api } from "@/lib/api";
import {
  karachiPickup,
  nextClientOrderId,
  randomMerchantId,
} from "@/lib/format";
import type {
  Assignment,
  Driver,
  Order,
  TimelineEvent,
  UpdateDriverStatusBody,
} from "@/lib/types";

const SERVICES = ["order", "dispatch", "tracking", "driver"] as const;

const emptyPickup = karachiPickup();

export function Dashboard() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [health, setHealth] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [form, setForm] = useState({
    merchantId: randomMerchantId(),
    latitude: String(emptyPickup.latitude),
    longitude: String(emptyPickup.longitude),
  });
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;

  const refresh = useCallback(async () => {
    try {
      const [nextDrivers, nextOrders, nextAssignments] = await Promise.all([
        api.listDrivers(),
        api.listOrders(),
        api.listAssignments(),
      ]);
      setDrivers(nextDrivers);
      setOrders(nextOrders);
      setAssignments(nextAssignments);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gateway is unreachable");
    }
  }, []);

  const refreshHealth = useCallback(async () => {
    const next: Record<string, boolean> = {};
    const gateway = await api.health().then(
      () => true,
      () => false,
    );
    next.gateway = gateway;
    await Promise.all(
      SERVICES.map(async (service) => {
        next[service] = await api.healthService(service).then(
          () => true,
          () => false,
        );
      }),
    );
    setHealth(next);
  }, []);

  useEffect(() => {
    void refresh();
    void refreshHealth();
    const dataTimer = window.setInterval(() => void refresh(), 2500);
    const healthTimer = window.setInterval(() => void refreshHealth(), 8000);
    return () => {
      window.clearInterval(dataTimer);
      window.clearInterval(healthTimer);
    };
  }, [refresh, refreshHealth]);

  useEffect(() => {
    if (!selectedOrderId) {
      setTimeline([]);
      return;
    }
    void api.getTimeline(selectedOrderId).then(setTimeline, () => setTimeline([]));
  }, [selectedOrderId, orders]);

  async function createOrder(body: {
    merchantId: string;
    latitude: number;
    longitude: number;
    clientOrderId?: string;
  }) {
    if (!body.merchantId || Number.isNaN(body.latitude) || Number.isNaN(body.longitude)) {
      setError("Merchant, latitude, and longitude are required");
      return;
    }
    setCreating(true);
    try {
      await api.createOrder({
        ...body,
        clientOrderId: body.clientOrderId ?? nextClientOrderId(),
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create order");
    } finally {
      setCreating(false);
    }
  }

  async function onDriverAction(
    driver: Driver,
    kind: "online" | "offline" | "accept" | "decline" | "complete" | "cancel",
  ) {
    const assignment = activeAssignment(driver, assignments);
    const body: UpdateDriverStatusBody | null =
      kind === "online"
        ? { status: "AVAILABLE" }
        : kind === "offline"
          ? { status: "OFFLINE" }
          : kind === "accept" && assignment
            ? { status: "BUSY", action: "ACCEPT", orderId: assignment.orderId }
            : kind === "decline" && assignment
              ? { status: "AVAILABLE", action: "DECLINE", orderId: assignment.orderId }
              : kind === "complete" && assignment
                ? {
                    status: "AVAILABLE",
                    action: "COMPLETE",
                    orderId: assignment.orderId,
                    latitude: assignment.latitude,
                    longitude: assignment.longitude,
                  }
                : kind === "cancel" && assignment
                  ? { status: "AVAILABLE", action: "CANCEL", orderId: assignment.orderId }
                  : null;

    if (!body) {
      setError("No active assignment for this driver yet. Wait for dispatch.");
      return;
    }

    setBusyId(driver.id);
    try {
      await api.updateDriverStatus(driver.id, body);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Driver update failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-kicker">Control panel</span>
          <h1>Dispatch Engine</h1>
          <p>
            Simulate merchants and drivers against the live microservices. Orders
            go through the gateway; matching, status, and timeline stay event-driven.
          </p>
        </div>
        <div className="health-row">
          {["gateway", ...SERVICES].map((service) => (
            <span
              key={service}
              className="health-chip"
              data-state={health[service] ? "up" : "down"}
            >
              <span className="health-dot" />
              {service}
            </span>
          ))}
        </div>
      </header>

      {error && (
        <div className="banner">
          {error}
          <button
            className="btn btn-ghost"
            style={{ marginLeft: 12 }}
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid-2">
        <OrdersPanel
          orders={orders}
          drivers={drivers}
          form={form}
          creating={creating}
          onFormChange={setForm}
          onCreate={() =>
            void createOrder({
              merchantId: form.merchantId.trim(),
              latitude: Number(form.latitude),
              longitude: Number(form.longitude),
            })
          }
          onShuffleMerchant={() =>
            setForm((current) => ({ ...current, merchantId: randomMerchantId() }))
          }
          onKarachi={() => {
            const pickup = karachiPickup();
            setForm((current) => ({
              ...current,
              latitude: String(pickup.latitude),
              longitude: String(pickup.longitude),
            }));
          }}
          onRetry={(order) =>
            void createOrder({
              merchantId: order.merchantId,
              latitude: order.latitude,
              longitude: order.longitude,
              clientOrderId: nextClientOrderId(),
            })
          }
          onOpenTimeline={(order) => setSelectedOrderId(order.id)}
        />
        <DriversPanel
          drivers={drivers}
          assignments={assignments}
          busyId={busyId}
          onAction={(driver, kind) => void onDriverAction(driver, kind)}
        />
      </div>

      {selectedOrder && (
        <TimelineDrawer
          order={selectedOrder}
          events={timeline}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </div>
  );
}
