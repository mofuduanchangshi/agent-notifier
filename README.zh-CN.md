# Agent Notifier

Agent Notifier 是一组 VS Code 扩展，用来把 SSH 远端服务器里的 Codex / Claude Code 状态提醒推送到你的 Mac。

它适合这种工作方式：

- 通过 VS Code Remote SSH 连接服务器。
- 在服务器的 tmux 里同时跑多个 Codex / Claude Code。
- 希望 agent 完成任务、等待确认、需要输入时，Mac 上能及时收到提醒。

## 组件

这个仓库包含两个 VS Code 扩展：

- `packages/remote`：安装在 SSH 远端。负责接收 Codex / Claude Code hooks，采集 tmux 信息，并把事件转发给本机。
- `packages/mac`：安装在 Mac 本机。负责通过 `osascript` 发送 macOS 原生通知。

已经打好的 VSIX 文件在 `vsix/` 目录：

- `vsix/agent-notifier-remote-0.3.2.vsix`
- `vsix/agent-notifier-mac-0.2.1.vsix`

## 安装

1. 在本机 Mac 的 VS Code 里安装：

   ```text
   vsix/agent-notifier-mac-0.2.1.vsix
   ```

   安装目标应为 `Local`。

2. 在 Remote SSH 的 VS Code 窗口里安装：

   ```text
   vsix/agent-notifier-remote-0.3.2.vsix
   ```

   安装目标应为 SSH 远端。

3. Reload VS Code 窗口。

4. 在 Remote SSH 窗口打开命令面板，运行：

   ```text
   Agent Notifier: Test Notification
   ```

   如果 Mac 能收到通知，说明远端到本机的链路正常。

5. 在 Remote SSH 窗口运行：

   ```text
   Agent Notifier: Install Hooks
   ```

6. 重启新开的 Codex / Claude Code 会话。

7. 如果 Codex 提示 hook 需要信任，在 Codex 里运行：

   ```text
   /hooks
   ```

   然后 trust Agent Notifier 相关 hook。

## 通知格式

在 tmux 中运行时，通知会优先显示 tmux 标识，而不是 Codex / Claude 的长 session id。

示例：

```text
Codex 已完成 - work:api.2

终端: work:api.2 %7
状态: 本轮已完成
```

需要你处理时：

```text
Claude 需要处理 - agents:claude.1

终端: agents:claude.1 %3
状态: 等待输入
```

如果没有 tmux 信息，扩展会退回显示目录和会话 id，方便定位。

## macOS 通知模式

Mac companion 支持两种显示方式。

普通通知：

```json
"agentNotifierMac.deliveryMode": "notification"
```

固定弹窗：

```json
"agentNotifierMac.deliveryMode": "stickyAlert"
```

`stickyAlert` 会弹出一个需要手动点 OK 的 macOS alert，适合你希望通知不要一闪而过的场景。

## 远端扩展设置

如果完成通知太频繁，可以只保留需要处理的提醒：

```json
"agentNotifier.notifyOnStop": false,
"agentNotifier.notifyOnAttention": true
```

默认会优先调用 Mac companion 的原生通知：

```json
"agentNotifier.preferMacNativeNotifications": true
```

如果 Mac companion 不可用，会自动退回 VS Code 通知。

## 写入的远端文件

远端扩展会写入：

```text
~/.agent-notifier/notify
~/.agent-notifier/env
~/.codex/hooks.json
~/.claude/settings.json
```

安装 hooks 时会保留已有配置；如果文件发生变化，会在同目录生成 `.bak-*` 备份。

## 开发

构建远端扩展：

```bash
cd packages/remote
npm install
npm test
npm run package
```

构建 Mac companion：

```bash
cd packages/mac
npm install
npm test
npm run package
```

## 说明

- 这个项目不依赖外部推送服务。
- VS Code 关闭或 Remote SSH 断开后，远端 hook receiver 不会继续运行。
- 需要离线/断连后也能提醒时，应接入 ntfy、Bark、Pushover、Telegram 等外部推送通道。

