"use client";

import { StatusBadge } from "@/components/status-badge";
import { formatCoords, formatTime, shortId } from "@/lib/format";
import type { Assignment, Driver } from "@/lib/types";

type Props = {
  drivers: Driver[];
  assignments: Assignment[];
  busyId: string | null;
  onAction: (driver: Driver, kind: "online" | "offline" | "accept" | "decline" | "complete" | "cancel") => void;
};

export function activeAssignment(driver: Driver, assignments: Assignment[]) {
  if (driver.status === "OFFERED") {
    return assignments.find(
      (row) => row.driverId === driver.id && row.status === "OFFERED",
    );
  }
  if (driver.status === "BUSY") {
    return assignments.find(
      (row) => row.driverId === driver.id && row.status === "CONFIRMED",
    );
  }
  return undefined;
}

export function DriversPanel({ drivers, assignments, busyId, onAction }: Props) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Driver simulation</h2>
          <p>Online, accept, decline, complete, or cancel. Offer and timeout come from dispatch.</p>
        </div>
        <span className="live">
          <span className="live-dot" />
          {drivers.length} drivers
        </span>
      </div>
      <div className="table-wrap">
        {drivers.length === 0 ? (
          <p className="empty">No drivers yet. Seed the driver database, then refresh.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Driver</th>
                <th>Status</th>
                <th>Location</th>
                <th>Order</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver) => {
                const assignment = activeAssignment(driver, assignments);
                const disabled = busyId === driver.id;
                return (
                  <tr key={driver.id}>
                    <td>
                      <div>{driver.name}</div>
                      <div className="mono" style={{ color: "var(--text-faint)" }}>
                        {shortId(driver.id)}
                      </div>
                    </td>
                    <td>
                      <StatusBadge value={driver.status} />
                    </td>
                    <td className="mono">{formatCoords(driver.lastLat, driver.lastLng)}</td>
                    <td className="mono">
                      {assignment ? shortId(assignment.orderId) : "—"}
                    </td>
                    <td>
                      <div className="actions">
                        {driver.status === "OFFLINE" && (
                          <button
                            className="btn btn-ok"
                            disabled={disabled}
                            onClick={() => onAction(driver, "online")}
                          >
                            Go online
                          </button>
                        )}
                        {driver.status === "AVAILABLE" && (
                          <button
                            className="btn"
                            disabled={disabled}
                            onClick={() => onAction(driver, "offline")}
                          >
                            Go offline
                          </button>
                        )}
                        {driver.status === "OFFERED" && (
                          <>
                            <button
                              className="btn btn-ok"
                              disabled={disabled || !assignment}
                              onClick={() => onAction(driver, "accept")}
                            >
                              Accept
                            </button>
                            <button
                              className="btn"
                              disabled={disabled || !assignment}
                              onClick={() => onAction(driver, "decline")}
                            >
                              Decline
                            </button>
                          </>
                        )}
                        {driver.status === "BUSY" && (
                          <>
                            <button
                              className="btn btn-primary"
                              disabled={disabled || !assignment}
                              onClick={() => onAction(driver, "complete")}
                            >
                              Complete
                            </button>
                            <button
                              className="btn btn-danger"
                              disabled={disabled || !assignment}
                              onClick={() => onAction(driver, "cancel")}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                      <div className="mono" style={{ color: "var(--text-faint)", marginTop: 6 }}>
                        seen {formatTime(driver.lastSeenAt)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
