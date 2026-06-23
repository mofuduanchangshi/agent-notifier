import assert from "node:assert/strict";
import { test } from "node:test";
import { formatAgentEvent } from "../src/events";

test("formats a Codex permission request as an approval notification", () => {
  const notification = formatAgentEvent({
    tool: "Codex",
    event: "PermissionRequest",
    payload: {
      cwd: "/repo",
      session_id: "abc"
    }
  });

  assert.equal(notification.title, "Codex 需要确认");
  assert.match(notification.body, /目录: \/repo/);
  assert.match(notification.body, /会话: abc/);
  assert.match(notification.body, /状态: 等待批准/);
});

test("uses compact tmux identity in the title and hides agent session ids", () => {
  const notification = formatAgentEvent({
    tool: "Codex",
    event: "Stop",
    payload: {
      cwd: "/data",
      session_id: "019eaf4c-c06b-70e2-9795-282dd5378e7f",
      agent_notifier_tmux: "work:api.2 %7",
      agent_notifier_host: "devbox"
    }
  });

  assert.equal(notification.title, "Codex 已完成 - work:api.2");
  assert.match(notification.body, /终端: work:api\.2 %7/);
  assert.doesNotMatch(notification.body, /主机:/);
  assert.doesNotMatch(notification.body, /目录:/);
  assert.match(notification.body, /状态: 本轮已完成/);
  assert.doesNotMatch(notification.body, /019eaf4c/);
});

test("describes Claude idle notifications as waiting for input", () => {
  const notification = formatAgentEvent({
    tool: "Claude",
    event: "Notification",
    payload: {
      notification_type: "idle_prompt",
      cwd: "/srv/app",
      agent_notifier_tmux: "agents:claude.1 %3",
      message: "Claude is waiting for your input"
    }
  });

  assert.equal(notification.title, "Claude 需要处理 - agents:claude.1");
  assert.match(notification.body, /状态: 等待输入/);
  assert.match(notification.body, /Claude is waiting/);
});
