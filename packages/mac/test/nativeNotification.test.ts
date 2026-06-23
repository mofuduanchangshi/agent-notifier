import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildOsascriptArgs,
  normalizeNativeNotification
} from "../src/nativeNotification";

test("builds osascript arguments that pass title and body as argv", () => {
  const args = buildOsascriptArgs({
    title: "Codex finished",
    body: "tmux: work:api.2 %7\ncwd: /data"
  });

  assert.deepEqual(args.slice(0, 5), [
    "-e",
    "on run argv",
    "-e",
    "display notification (item 2 of argv) with title (item 1 of argv)",
    "-e"
  ]);
  assert.equal(args.at(-2), "Codex finished");
  assert.equal(args.at(-1), "tmux: work:api.2 %7\ncwd: /data");
});

test("builds sticky alert arguments that stay until dismissed", () => {
  const args = buildOsascriptArgs(
    {
      title: "Codex needs approval",
      body: "tmux: work:api.2 %7\ncwd: /data"
    },
    "stickyAlert"
  );

  assert.deepEqual(args.slice(0, 5), [
    "-e",
    "on run argv",
    "-e",
    "display alert (item 1 of argv) message (item 2 of argv) as warning buttons {\"OK\"} default button \"OK\"",
    "-e"
  ]);
  assert.equal(args.at(-2), "Codex needs approval");
  assert.equal(args.at(-1), "tmux: work:api.2 %7\ncwd: /data");
});

test("normalizes untrusted payload into bounded notification text", () => {
  const payload = normalizeNativeNotification({
    title: "Claude needs attention",
    body: "x".repeat(2000)
  });

  assert.equal(payload.title, "Claude needs attention");
  assert.equal(payload.body.length, 1000);
});
