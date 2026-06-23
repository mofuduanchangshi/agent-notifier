export interface HelperScriptOptions {
  port: number;
  token: string;
}

export function createHelperScript(options: HelperScriptOptions): string {
  return `#!/usr/bin/env bash
set +e

tool="\${1:-Agent}"
payload="$(cat || true)"
tmux_label=""

if [ -n "\${TMUX_PANE:-}" ] && command -v tmux >/dev/null 2>&1; then
  tmux_label="$(tmux display-message -p -t "\${TMUX_PANE}" '#S:#W.#P #{pane_id}' 2>/dev/null || true)"
fi

curl -fsS -m 2 \\
  -X POST \\
  -H 'content-type: application/json' \\
  -H 'x-agent-notifier-token: ${options.token}' \\
  -H "x-agent-notifier-tmux: $tmux_label" \\
  --data-binary "$payload" \\
  "http://127.0.0.1:${options.port}/notify?tool=\${tool}" >/dev/null 2>&1 || true

exit 0
`;
}
