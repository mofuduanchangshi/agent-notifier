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

  assert.equal(notification.title, "Codex needs approval");
  assert.match(notification.body, /cwd: \/repo/);
  assert.match(notification.body, /session: abc/);
});

test("prefers tmux pane labels over agent session ids", () => {
  const notification = formatAgentEvent({
    tool: "Codex",
    event: "Stop",
    payload: {
      cwd: "/data",
      session_id: "019eaf4c-c06b-70e2-9795-282dd5378e7f",
      agent_notifier_tmux: "work:api.2 %7"
    }
  });

  assert.equal(notification.title, "Codex finished");
  assert.match(notification.body, /tmux: work:api\.2 %7/);
  assert.doesNotMatch(notification.body, /019eaf4c/);
});
