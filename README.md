# Agent Notifier

VS Code Remote SSH notifications for Codex and Claude Code.

This repository contains two VS Code extensions:

- `packages/remote`: install on the SSH remote side. It receives Codex and Claude Code hook events, adds tmux metadata when available, and forwards notifications.
- `packages/mac`: install locally on macOS. It displays native macOS notifications through `osascript`.

Prebuilt VSIX files are in `vsix/`.

## Install

1. Install `vsix/agent-notifier-mac-0.2.1.vsix` locally on the Mac.
2. Install `vsix/agent-notifier-remote-0.2.0.vsix` in the Remote SSH VS Code window.
3. Reload VS Code.
4. In the Remote SSH window, run `Agent Notifier: Install Hooks`.
5. Restart Codex and Claude Code sessions.

## Sticky Alerts

The Mac companion supports:

```json
"agentNotifierMac.deliveryMode": "notification"
```

or:

```json
"agentNotifierMac.deliveryMode": "stickyAlert"
```

Use `stickyAlert` if you want the alert to stay until dismissed.

## Build

```bash
cd packages/remote
npm install
npm test
npm run package

cd ../mac
npm install
npm test
npm run package
```

