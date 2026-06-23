import { execFile } from "node:child_process";
import os from "node:os";
import { promisify } from "node:util";
import * as vscode from "vscode";
import { buildOsascriptArgs, NativeDeliveryMode, normalizeNativeNotification } from "./nativeNotification";

const execFileAsync = promisify(execFile);

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("agentNotifierMac.notify", async (payload: unknown) => {
      const notification = normalizeNativeNotification(payload);
      const deliveryMode = vscode.workspace
        .getConfiguration("agentNotifierMac")
        .get<NativeDeliveryMode>("deliveryMode", "notification");

      if (os.platform() !== "darwin") {
        vscode.window.showInformationMessage(`${notification.title}\n${notification.body}`);
        return false;
      }

      await execFileAsync("/usr/bin/osascript", buildOsascriptArgs(notification, deliveryMode));
      return true;
    })
  );
}

export function deactivate(): void {
  // No background resources.
}
