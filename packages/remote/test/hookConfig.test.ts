import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AGENT_NOTIFIER_MARKER,
  mergeClaudeSettings,
  mergeCodexHooks
} from "../src/hookConfig";

test("merges Codex hooks without removing existing hook groups", () => {
  const result = mergeCodexHooks(
    {
      hooks: {
        Stop: [
          {
            hooks: [
              {
                type: "command",
                command: "echo existing"
              }
            ]
          }
        ]
      }
    },
    "/home/me/.agent-notifier/notify"
  );

  assert.equal(result.hooks.Stop.length, 2);
  assert.equal(result.hooks.Stop[0].hooks[0].command, "echo existing");
  assert.match(result.hooks.PermissionRequest[0].hooks[0].command, /Codex/);
  assert.match(result.hooks.Stop[1].hooks[0].command, new RegExp(AGENT_NOTIFIER_MARKER));
});

test("replaces previous Agent Notifier hook groups instead of duplicating them", () => {
  const first = mergeCodexHooks({}, "/home/me/.agent-notifier/notify");
  const second = mergeCodexHooks(first, "/home/me/.agent-notifier/notify");

  assert.equal(second.hooks.PermissionRequest.length, 1);
  assert.equal(second.hooks.Stop.length, 1);
});

test("merges Claude settings while preserving unrelated settings", () => {
  const result = mergeClaudeSettings(
    {
      theme: "dark",
      hooks: {
        Notification: [
          {
            matcher: "idle_prompt",
            hooks: [
              {
                type: "command",
                command: "echo existing"
              }
            ]
          }
        ]
      }
    },
    "/home/me/.agent-notifier/notify"
  );

  assert.equal(result.theme, "dark");
  assert.equal(result.hooks.Notification.length, 2);
  assert.equal(result.hooks.Notification[0].hooks[0].command, "echo existing");
  assert.match(result.hooks.Notification[1].hooks[0].command, /Claude/);
  assert.match(result.hooks.Stop[0].hooks[0].command, new RegExp(AGENT_NOTIFIER_MARKER));
  assert.match(result.hooks.SubagentStop[0].hooks[0].command, new RegExp(AGENT_NOTIFIER_MARKER));
});

