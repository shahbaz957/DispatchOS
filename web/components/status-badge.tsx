"use client";

type Tone = "muted" | "ok" | "warn" | "info" | "danger";

const STATUS_TONE: Record<string, Tone> = {
  OFFLINE: "muted",
  AVAILABLE: "ok",
  OFFERED: "warn",
  BUSY: "info",
  PENDING_DISPATCH: "muted",
  ASSIGNED: "info",
  COMPLETED: "ok",
  CANCELLED: "danger",
  CONFIRMED: "info",
  REJECTED: "danger",
  TIMEOUT: "warn",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span className="pill" data-tone={STATUS_TONE[value] ?? "muted"}>
      {value.replaceAll("_", " ")}
    </span>
  );
}
