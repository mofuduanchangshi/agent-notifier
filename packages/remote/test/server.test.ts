import assert from "node:assert/strict";
import { test } from "node:test";
import { AgentNotifierServer } from "../src/server";

test("receives authorized hook events and rejects invalid tokens", async () => {
  const received: Array<{ tool: string; event: string; payload: Record<string, unknown> | undefined }> = [];
  const server = new AgentNotifierServer({
    token: "secret",
    onEvent: (event) => {
      received.push({
        tool: event.tool,
        event: event.event,
        payload: event.payload
      });
    }
  });

  await server.start(0);

  try {
    const validResponse = await fetch(`http://127.0.0.1:${server.port}/notify?tool=Codex`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-agent-notifier-token": "secret",
        "x-agent-notifier-tmux": "work:api.2 %7"
      },
      body: JSON.stringify({
        hook_event_name: "Stop"
      })
    });

    assert.equal(validResponse.status, 204);
    assert.deepEqual(received, [
      {
        tool: "Codex",
        event: "Stop",
        payload: {
          hook_event_name: "Stop",
          agent_notifier_tmux: "work:api.2 %7"
        }
      }
    ]);

    const invalidResponse = await fetch(`http://127.0.0.1:${server.port}/notify?tool=Codex`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-agent-notifier-token": "wrong"
      },
      body: "{}"
    });

    assert.equal(invalidResponse.status, 401);
  } finally {
    await server.stop();
  }
});
