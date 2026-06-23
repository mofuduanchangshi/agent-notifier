export type AgentTool = "Codex" | "Claude" | string;

export interface AgentEvent {
  tool: AgentTool;
  event: string;
  payload?: Record<string, unknown>;
}

export interface FormattedAgentNotification {
  title: string;
  body: string;
  category: "attention" | "stop" | "other";
}

export function formatAgentEvent(agentEvent: AgentEvent): FormattedAgentNotification {
  const payload = agentEvent.payload ?? {};
  const normalizedEvent = String(payload.hook_event_name ?? agentEvent.event);
  const notificationType = String(payload.notification_type ?? "");
  const title = formatTitle(agentEvent.tool, normalizedEvent, notificationType);
  const category = categorizeEvent(normalizedEvent, notificationType);
  const body = formatBody(payload);

  return {
    title,
    body,
    category
  };
}

function formatTitle(tool: string, event: string, notificationType: string): string {
  if (event === "PermissionRequest") {
    return `${tool} needs approval`;
  }

  if (event === "Notification") {
    if (notificationType === "permission_prompt") {
      return `${tool} needs approval`;
    }

    return `${tool} needs attention`;
  }

  if (event === "Stop" || event === "SubagentStop") {
    return `${tool} finished`;
  }

  return `${tool} ${event}`;
}

function categorizeEvent(event: string, notificationType: string): "attention" | "stop" | "other" {
  if (event === "PermissionRequest" || event === "Notification" || notificationType === "permission_prompt") {
    return "attention";
  }

  if (event === "Stop" || event === "SubagentStop") {
    return "stop";
  }

  return "other";
}

function formatBody(payload: Record<string, unknown>): string {
  const lines: string[] = [];
  const cwd = readString(payload, "cwd");
  const session = readString(payload, "session_id") ?? readString(payload, "thread_id");
  const tmux = readString(payload, "agent_notifier_tmux");
  const message = readString(payload, "message") ?? readNestedString(payload, ["tool_input", "description"]);
  const toolName = readString(payload, "tool_name");

  if (cwd) {
    lines.push(`cwd: ${cwd}`);
  }

  if (tmux) {
    lines.push(`tmux: ${tmux}`);
  } else if (session) {
    lines.push(`session: ${session}`);
  }

  if (toolName) {
    lines.push(`tool: ${toolName}`);
  }

  if (message) {
    lines.push("");
    lines.push(limitText(message, 700));
  }

  return lines.length > 0 ? lines.join("\n") : "Agent event received.";
}

function readString(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readNestedString(payload: Record<string, unknown>, path: string[]): string | undefined {
  let current: unknown = payload;

  for (const key of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === "string" && current.length > 0 ? current : undefined;
}

function limitText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}...`;
}
