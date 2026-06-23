import http from "node:http";
import { AddressInfo } from "node:net";
import { AgentEvent } from "./events";

export interface AgentNotifierServerOptions {
  token: string;
  onEvent: (event: AgentEvent) => void;
}

export class AgentNotifierServer {
  private readonly token: string;
  private readonly onEvent: (event: AgentEvent) => void;
  private server: http.Server | undefined;
  private currentPort: number | undefined;

  constructor(options: AgentNotifierServerOptions) {
    this.token = options.token;
    this.onEvent = options.onEvent;
  }

  get port(): number {
    if (this.currentPort === undefined) {
      throw new Error("Agent Notifier server is not running");
    }

    return this.currentPort;
  }

  async start(port = 0): Promise<void> {
    await this.stop();

    this.server = http.createServer((request, response) => {
      void this.handleRequest(request, response);
    });

    await new Promise<void>((resolve, reject) => {
      this.server?.once("error", reject);
      this.server?.listen(port, "127.0.0.1", () => {
        this.server?.off("error", reject);
        const address = this.server?.address() as AddressInfo | null;
        this.currentPort = address?.port;
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }

    const serverToClose = this.server;
    this.server = undefined;
    this.currentPort = undefined;

    await new Promise<void>((resolve, reject) => {
      serverToClose.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  private async handleRequest(request: http.IncomingMessage, response: http.ServerResponse): Promise<void> {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");

    if (request.method !== "POST" || requestUrl.pathname !== "/notify") {
      response.writeHead(404).end();
      return;
    }

    if (request.headers["x-agent-notifier-token"] !== this.token) {
      response.writeHead(401).end();
      return;
    }

    const rawBody = await readRequestBody(request);
    const payload = parsePayload(rawBody);
    const tmux = readHeaderString(request.headers["x-agent-notifier-tmux"]);
    const host = readHeaderString(request.headers["x-agent-notifier-host"]);

    if (tmux) {
      payload.agent_notifier_tmux = tmux;
    }

    if (host) {
      payload.agent_notifier_host = host;
    }

    const tool = requestUrl.searchParams.get("tool") ?? readString(payload, "tool") ?? "Agent";
    const event = readString(payload, "hook_event_name") ?? readString(payload, "type") ?? "notification";

    this.onEvent({
      tool,
      event,
      payload
    });

    response.writeHead(204).end();
  }
}

async function readRequestBody(request: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

function parsePayload(rawBody: string): Record<string, unknown> {
  if (!rawBody.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return {
      message: rawBody
    };
  }

  return {};
}

function readString(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readHeaderString(value: string | string[] | undefined): string | undefined {
  const header = Array.isArray(value) ? value[0] : value;
  return typeof header === "string" && header.length > 0 ? header : undefined;
}
