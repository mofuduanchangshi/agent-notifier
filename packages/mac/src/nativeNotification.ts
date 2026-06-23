export interface NativeNotification {
  title: string;
  body: string;
}

export type NativeDeliveryMode = "notification" | "stickyAlert";

export function normalizeNativeNotification(value: unknown): NativeNotification {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      title: "Agent Notifier",
      body: "Agent event received."
    };
  }

  const record = value as Record<string, unknown>;
  return {
    title: limitText(readString(record.title) ?? "Agent Notifier", 120),
    body: limitText(readString(record.body) ?? "Agent event received.", 1000)
  };
}

export function buildOsascriptArgs(
  notification: NativeNotification,
  deliveryMode: NativeDeliveryMode = "notification"
): string[] {
  if (deliveryMode === "stickyAlert") {
    return [
      "-e",
      "on run argv",
      "-e",
      "display alert (item 1 of argv) message (item 2 of argv) as warning buttons {\"OK\"} default button \"OK\"",
      "-e",
      "end run",
      notification.title,
      notification.body
    ];
  }

  return [
    "-e",
    "on run argv",
    "-e",
    "display notification (item 2 of argv) with title (item 1 of argv)",
    "-e",
    "end run",
    notification.title,
    notification.body
  ];
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function limitText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return value.slice(0, maxLength);
}
