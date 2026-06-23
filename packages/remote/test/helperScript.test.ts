import assert from "node:assert/strict";
import { test } from "node:test";
import { createHelperScript } from "../src/helperScript";

test("creates a hook helper script that posts stdin to the loopback receiver", () => {
  const script = createHelperScript({
    port: 43123,
    token: "secret-token"
  });

  assert.match(script, /127\.0\.0\.1/);
  assert.match(script, /43123/);
  assert.match(script, /secret-token/);
  assert.match(script, /x-agent-notifier-token/);
  assert.match(script, /payload="\$\(cat \|\| true\)"/);
  assert.match(script, /TMUX_PANE/);
  assert.match(script, /tmux display-message/);
  assert.match(script, /x-agent-notifier-tmux/);
  assert.match(script, /exit 0/);
  assert.match(script, /\|\| true/);
});
