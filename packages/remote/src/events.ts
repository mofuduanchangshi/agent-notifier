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
  const title = formatTitle(agentEvent.tool, normalizedEvent, notificationType, payload);
  const category = categorizeEvent(normalizedEvent, notificationType);
  const body = formatBody(payload, formatStatus(normalizedEvent, notificationType));

  return {
    title,
    body,
    category
  };
}

function formatTitle(
  tool: string,
  event: string,
  notificationType: string,
  payload: Record<string, unknown>
): string {
  const identity = formatIdentitySuffix(payload);
  const baseTitle = formatBaseTitle(tool, event, notificationType);

  return identity ? `${baseTitle} - ${identity}` : baseTitle;
}

function formatBaseTitle(tool: string, event: string, notificationType: string): string {
  if (event === "PermissionRequest") {
    return `${tool} 需要确认`;
  }

  if (event === "Notification") {
    if (notificationType === "permission_prompt") {
      return `${tool} 需要确认`;
    }

    return `${tool} 需要处理`;
  }

  if (event === "Stop" || event === "SubagentStop") {
    return `${tool} 已完成`;
  }

  return `${tool} ${event}`;
}

function formatIdentitySuffix(payload: Record<string, unknown>): string | undefined {
  const tmux = readString(payload, "agent_notifier_tmux");
  if (tmux) {
    return formatTmuxSessionName(tmux);
  }

  return undefined;
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

function formatStatus(event: string, notificationType: string): string {
  if (event === "PermissionRequest" || notificationType === "permission_prompt") {
    return "等待批准";
  }

  if (event === "Notification") {
    if (notificationType === "idle_prompt") {
      return "等待输入";
    }

    if (notificationType === "elicitation_dialog") {
      return "等待确认";
    }

    return "需要处理";
  }

  if (event === "Stop") {
    return "本轮已完成";
  }

  if (event === "SubagentStop") {
    return "子任务已完成";
  }

  return "收到事件";
}

function formatBody(payload: Record<string, unknown>, status: string): string {
  const lines: string[] = [];
  const cwd = readString(payload, "cwd");
  const session = readString(payload, "session_id") ?? readString(payload, "thread_id");
  const tmux = readString(payload, "agent_notifier_tmux");
  const host = readString(payload, "agent_notifier_host");
  const message = readString(payload, "message") ?? readNestedString(payload, ["tool_input", "description"]);
  const toolName = readString(payload, "tool_name");
  const tmuxSessionName = tmux ? formatTmuxSessionName(tmux) : undefined;

  if (tmux) {
    lines.push(`终端: ${tmuxSessionName ?? tmux}`);
  }

  if (!tmux && host) {
    lines.push(`主机: ${host}`);
  }

  if (!tmux && cwd) {
    lines.push(`目录: ${cwd}`);
  }

  lines.push(`状态: ${status}`);

  if (!tmux && session) {
    lines.push(`会话: ${session}`);
  }

  if (toolName) {
    lines.push(`工具: ${toolName}`);
  }

  if (message) {
    lines.push("");
    lines.push(limitText(message, 700));
  }

  return lines.length > 0 ? lines.join("\n") : "收到 Agent 事件。";
}

function readString(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function formatTmuxSessionName(tmuxLabel: string): string | undefined {
  const compactIdentity = tmuxLabel.split(/\s+/)[0];
  const sessionName = compactIdentity.split(":")[0];
  return sessionName || compactIdentity || undefined;
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
