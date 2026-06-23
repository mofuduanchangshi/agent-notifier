# Agent Notifier

Agent Notifier forwards Codex and Claude Code hook events from a VS Code Remote SSH host to notifications on your local Mac.

## How It Works

1. Install the extension in the SSH remote workspace.
2. The extension starts a loopback receiver on the remote host.
3. The extension writes `~/.agent-notifier/notify`.
4. Run `Agent Notifier: Install Hooks`.
5. Codex and Claude Code hooks call the helper.
6. The extension shows VS Code notifications in your local Mac window.

For native macOS Notification Center banners, install `agent-notifier-mac-0.2.0.vsix` locally on the Mac. This remote extension will call the companion command when it is available and will fall back to VS Code notifications otherwise.

## Commands

- `Agent Notifier: Start Server`: restart the remote hook receiver.
- `Agent Notifier: Test Notification`: verify Mac notifications are visible.
- `Agent Notifier: Install Hooks`: merge global Codex and Claude hook configuration.
- `Agent Notifier: Show Setup`: show helper path, listener status, and config paths.

## Files Written on the Remote Host

- `~/.agent-notifier/notify`
- `~/.agent-notifier/env`
- `~/.codex/hooks.json`
- `~/.claude/settings.json`

Existing Codex and Claude JSON files are preserved. When a file changes, a timestamped `.bak-*` file is created next to it.

## Notes

Codex may require you to trust the newly installed hook. Open `/hooks` in Codex and trust the Agent Notifier hook if Codex reports that hooks need review.

The extension deliberately sends only compact notification metadata to VS Code: tool, event, working directory, session id, tool name, and short message text.

When hooks run inside tmux, the helper adds a tmux label such as `work:api.2 %7`. Notifications prefer that label over the Codex/Claude session id.
