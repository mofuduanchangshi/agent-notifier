import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import * as vscode from "vscode";
import { formatAgentEvent, AgentEvent } from "./events";
import { createHelperScript } from "./helperScript";
import { mergeClaudeSettings, mergeCodexHooks } from "./hookConfig";
import { AgentNotifierServer } from "./server";

interface BridgeState {
  server: AgentNotifierServer;
  token: string;
  helperPath: string;
  envPath: string;
}

let bridge: BridgeState | undefined;
let output: vscode.OutputChannel | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  output = vscode.window.createOutputChannel("Agent Notifier");
  context.subscriptions.push(output);

  context.subscriptions.push(
    vscode.commands.registerCommand("agentNotifier.startServer", async () => {
      await startBridge(context, true);
    }),
    vscode.commands.registerCommand("agentNotifier.testNotification", async () => {
      await startBridge(context, false);
      handleAgentEvent({
        tool: "Agent Notifier",
        event: "Notification",
        payload: {
          cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? os.homedir(),
          message: "Test notification from the remote extension host."
        }
      });
    }),
    vscode.commands.registerCommand("agentNotifier.installHooks", async () => {
      const currentBridge = await startBridge(context, false);
      const result = await installHooks(currentBridge.helperPath);
      const message = [
        "Agent Notifier hooks installed.",
        `Codex: ${result.codexPath}`,
        `Claude: ${result.claudePath}`,
        "Restart Codex/Claude sessions if they do not pick up the changed settings."
      ].join("\n");

      vscode.window.showInformationMessage("Agent Notifier hooks installed.");
      output?.appendLine(message);
      output?.show(true);
    }),
    vscode.commands.registerCommand("agentNotifier.showSetup", async () => {
      const currentBridge = await startBridge(context, false);
      const lines = [
        `Server: http://127.0.0.1:${currentBridge.server.port}`,
        `Helper: ${currentBridge.helperPath}`,
        `Env: ${currentBridge.envPath}`,
        `Codex hooks: ${path.join(os.homedir(), ".codex", "hooks.json")}`,
        `Claude settings: ${path.join(os.homedir(), ".claude", "settings.json")}`
      ];

      output?.appendLine(lines.join("\n"));
      output?.show(true);
      vscode.window.showInformationMessage("Agent Notifier setup details are in the Output panel.");
    })
  );

  await startBridge(context, false);
}

export async function deactivate(): Promise<void> {
  if (bridge) {
    await bridge.server.stop();
  }
}

async function startBridge(context: vscode.ExtensionContext, showMessage: boolean): Promise<BridgeState> {
  if (bridge) {
    await bridge.server.stop();
  }

  const token = context.globalState.get<string>("agentNotifier.token") ?? crypto.randomBytes(24).toString("hex");
  await context.globalState.update("agentNotifier.token", token);

  const server = new AgentNotifierServer({
    token,
    onEvent: handleAgentEvent
  });

  await server.start(0);

  const baseDir = path.join(os.homedir(), ".agent-notifier");
  const helperPath = path.join(baseDir, "notify");
  const envPath = path.join(baseDir, "env");

  await fs.mkdir(baseDir, {
    recursive: true,
    mode: 0o700
  });
  await fs.writeFile(helperPath, createHelperScript({ port: server.port, token }), {
    mode: 0o755
  });
  await fs.chmod(helperPath, 0o755);
  await fs.writeFile(
    envPath,
    [
      `AGENT_NOTIFIER_PORT=${server.port}`,
      `AGENT_NOTIFIER_TOKEN=${token}`,
      `AGENT_NOTIFIER_HELPER=${helperPath}`
    ].join("\n") + "\n",
    {
      mode: 0o600
    }
  );

  bridge = {
    server,
    token,
    helperPath,
    envPath
  };

  const status = `Agent Notifier listening on 127.0.0.1:${server.port}`;
  output?.appendLine(status);

  if (showMessage) {
    vscode.window.showInformationMessage(status);
  }

  return bridge;
}

function handleAgentEvent(event: AgentEvent): void {
  const notification = formatAgentEvent(event);
  const settings = vscode.workspace.getConfiguration("agentNotifier");

  if (notification.category === "attention" && !settings.get<boolean>("notifyOnAttention", true)) {
    return;
  }

  if (notification.category === "stop" && !settings.get<boolean>("notifyOnStop", true)) {
    return;
  }

  void notifyUser(notification);
}

async function notifyUser(notification: ReturnType<typeof formatAgentEvent>): Promise<void> {
  const settings = vscode.workspace.getConfiguration("agentNotifier");
  const preferMacNative = settings.get<boolean>("preferMacNativeNotifications", true);
  const message = `${notification.title}\n${notification.body}`;

  if (preferMacNative) {
    try {
      const delivered = await vscode.commands.executeCommand<boolean>("agentNotifierMac.notify", {
        title: notification.title,
        body: notification.body,
        category: notification.category
      });

      if (delivered) {
        return;
      }
    } catch (error) {
      output?.appendLine(`Mac native notification unavailable: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (notification.category === "attention") {
    vscode.window.showWarningMessage(message);
    return;
  }

  vscode.window.showInformationMessage(message);
}

async function installHooks(helperPath: string): Promise<{ codexPath: string; claudePath: string }> {
  const home = os.homedir();
  const codexPath = path.join(home, ".codex", "hooks.json");
  const claudePath = path.join(home, ".claude", "settings.json");

  await writeMergedJson(codexPath, (existing) => mergeCodexHooks(existing, helperPath));
  await writeMergedJson(claudePath, (existing) => mergeClaudeSettings(existing, helperPath));

  return {
    codexPath,
    claudePath
  };
}

async function writeMergedJson(filePath: string, merge: (existing: unknown) => unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), {
    recursive: true
  });

  const existing = await readJsonFile(filePath);
  const merged = merge(existing);
  const nextContent = `${JSON.stringify(merged, null, 2)}\n`;
  const previousContent = await readTextFile(filePath);

  if (previousContent === nextContent) {
    return;
  }

  if (previousContent !== undefined) {
    await fs.copyFile(filePath, `${filePath}.bak-${timestamp()}`);
  }

  await fs.writeFile(filePath, nextContent, "utf8");
}

async function readJsonFile(filePath: string): Promise<unknown> {
  const content = await readTextFile(filePath);

  if (content === undefined || !content.trim()) {
    return {};
  }

  try {
    return JSON.parse(content) as unknown;
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function readTextFile(filePath: string): Promise<string | undefined> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
}

function timestamp(): string {
  return new Date().toISOString().replaceAll(/[:.]/g, "-");
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
