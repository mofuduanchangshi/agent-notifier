export const AGENT_NOTIFIER_MARKER = "agent-notifier-vscode";

type JsonObject = Record<string, unknown>;

interface HookHandler {
  type: "command";
  command: string;
  timeout?: number;
  statusMessage?: string;
}

interface HookGroup {
  matcher?: string;
  hooks: HookHandler[];
}

interface HookConfig {
  hooks: Record<string, HookGroup[]>;
  [key: string]: unknown;
}

export function mergeCodexHooks(existing: unknown, helperPath: string): HookConfig {
  const config = asObject(existing);
  const hooks = normalizeHooks(config.hooks);

  addHookGroup(hooks, "PermissionRequest", {
    matcher: "*",
    hooks: [commandHook(helperPath, "Codex", "Forwarding Codex approval request")]
  });

  addHookGroup(hooks, "Stop", {
    hooks: [commandHook(helperPath, "Codex", "Forwarding Codex completion")]
  });

  return {
    ...config,
    hooks
  };
}

export function mergeClaudeSettings(existing: unknown, helperPath: string): HookConfig {
  const config = asObject(existing);
  const hooks = normalizeHooks(config.hooks);

  addHookGroup(hooks, "PermissionRequest", {
    matcher: "*",
    hooks: [commandHook(helperPath, "Claude", "Forwarding Claude approval request")]
  });

  addHookGroup(hooks, "Notification", {
    matcher: "permission_prompt|idle_prompt|elicitation_dialog",
    hooks: [commandHook(helperPath, "Claude", "Forwarding Claude notification")]
  });

  addHookGroup(hooks, "Stop", {
    hooks: [commandHook(helperPath, "Claude", "Forwarding Claude completion")]
  });

  addHookGroup(hooks, "SubagentStop", {
    matcher: "*",
    hooks: [commandHook(helperPath, "Claude", "Forwarding Claude subagent completion")]
  });

  return {
    ...config,
    hooks
  };
}

function addHookGroup(hooks: Record<string, HookGroup[]>, eventName: string, group: HookGroup): void {
  const existingGroups = hooks[eventName] ?? [];
  hooks[eventName] = [
    ...existingGroups.filter((existingGroup) => !isAgentNotifierGroup(existingGroup)),
    group
  ];
}

function commandHook(helperPath: string, tool: "Codex" | "Claude", statusMessage: string): HookHandler {
  return {
    type: "command",
    command: `AGENT_NOTIFIER_MARKER=${AGENT_NOTIFIER_MARKER} ${shellQuote(helperPath)} ${shellQuote(tool)}`,
    timeout: 10,
    statusMessage
  };
}

function isAgentNotifierGroup(group: HookGroup): boolean {
  return group.hooks.some((hook) => hook.command.includes(AGENT_NOTIFIER_MARKER));
}

function normalizeHooks(value: unknown): Record<string, HookGroup[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const result: Record<string, HookGroup[]> = {};

  for (const [eventName, groups] of Object.entries(value as JsonObject)) {
    if (!Array.isArray(groups)) {
      continue;
    }

    result[eventName] = groups.filter(isHookGroup).map((group) => ({
      ...group,
      hooks: group.hooks.filter(isCommandHook)
    }));
  }

  return result;
}

function isHookGroup(value: unknown): value is HookGroup {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const hooks = (value as JsonObject).hooks;
  return Array.isArray(hooks);
}

function isCommandHook(value: unknown): value is HookHandler {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const hook = value as JsonObject;
  return hook.type === "command" && typeof hook.command === "string";
}

function asObject(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as JsonObject;
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}
