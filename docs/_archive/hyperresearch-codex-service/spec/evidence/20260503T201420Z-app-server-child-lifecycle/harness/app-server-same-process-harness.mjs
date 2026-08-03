#!/usr/bin/env node
import { spawn } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-appserver-a2-"));
const codexHome = path.join(root, "codex-home");
const cwd = path.join(root, "workspace");
const jsonrpcLog = path.join(root, "jsonrpc.jsonl");
const stderrLog = path.join(root, "app-server.stderr.log");
const requestsLog = path.join(root, "mock-responses-requests.jsonl");
const summaryPath = path.join(root, "summary.json");
fs.mkdirSync(codexHome, { recursive: true });
fs.mkdirSync(cwd, { recursive: true });

const PARENT_PROMPT =
  "A2 app-server diagnostic: spawn one child agent with message 'A2 child write deterministic result', wait for it, close it, then say done.";
const CHILD_PROMPT = "A2 child write deterministic result";
const SPAWN_CALL_ID = "spawn-call-1";
const WAIT_CALL_ID = "wait-call-1";
const CLOSE_CALL_ID = "close-call-1";

function sse(events) {
  return events
    .map((ev) => `event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`)
    .join("");
}

function evResponseCreated(id) {
  return { type: "response.created", response: { id } };
}

function evCompleted(id) {
  return {
    type: "response.completed",
    response: {
      id,
      usage: {
        input_tokens: 0,
        input_tokens_details: null,
        output_tokens: 0,
        output_tokens_details: null,
        total_tokens: 0,
      },
    },
  };
}

function evAssistantMessage(id, text) {
  return {
    type: "response.output_item.done",
    item: {
      type: "message",
      role: "assistant",
      id,
      content: [{ type: "output_text", text }],
    },
  };
}

function evFunctionCall(callId, name, args) {
  return {
    type: "response.output_item.done",
    item: {
      type: "function_call",
      call_id: callId,
      name,
      arguments: JSON.stringify(args),
    },
  };
}

function extractAgentId(bodyText) {
  const direct = bodyText.match(/\\"agent_id\\"\s*:\s*\\"([^"\\]+)\\"/);
  if (direct) return direct[1];
  const loose = bodyText.match(/agent[_-]id[^0-9a-f]*(019[0-9a-f-]{20,})/i);
  if (loose) return loose[1];
  const threadish = [...bodyText.matchAll(/019[0-9a-f]{4,}-[0-9a-f-]{20,}/gi)].map(
    (m) => m[0],
  );
  return threadish.at(-1) ?? null;
}

const mockState = {
  requests: 0,
  parentSpawnResponses: 0,
  childResponses: 0,
  waitResponses: 0,
  closeResponses: 0,
  finalResponses: 0,
  seenAgentIds: [],
};

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    const bodyText = Buffer.concat(chunks).toString("utf8");
    mockState.requests += 1;
    fs.appendFileSync(
      requestsLog,
      JSON.stringify({
        at: new Date().toISOString(),
        method: req.method,
        url: req.url,
        body: JSON.parse(bodyText || "{}"),
      }) + "\n",
    );

    let responseId = `resp-${mockState.requests}`;
    let events;
    const agentId = extractAgentId(bodyText);
    if (agentId && !mockState.seenAgentIds.includes(agentId)) {
      mockState.seenAgentIds.push(agentId);
    }

    if (bodyText.includes(PARENT_PROMPT) && !bodyText.includes(SPAWN_CALL_ID)) {
      mockState.parentSpawnResponses += 1;
      events = [
        evResponseCreated(responseId),
        evFunctionCall(SPAWN_CALL_ID, "spawn_agent", {
          message: CHILD_PROMPT,
          model: "gpt-5.2",
          reasoning_effort: "low",
        }),
        evCompleted(responseId),
      ];
    } else if (bodyText.includes(CHILD_PROMPT) && !bodyText.includes(SPAWN_CALL_ID)) {
      mockState.childResponses += 1;
      events = [
        evResponseCreated(responseId),
        evAssistantMessage("msg-child-1", JSON.stringify({ a2_child_result: "ok" })),
        evCompleted(responseId),
      ];
    } else if (bodyText.includes(SPAWN_CALL_ID) && !bodyText.includes(WAIT_CALL_ID)) {
      mockState.waitResponses += 1;
      events = [
        evResponseCreated(responseId),
        evFunctionCall(WAIT_CALL_ID, "wait_agent", {
          targets: agentId ? [agentId] : [],
          timeout_ms: 10000,
        }),
        evCompleted(responseId),
      ];
    } else if (bodyText.includes(WAIT_CALL_ID) && !bodyText.includes(CLOSE_CALL_ID)) {
      mockState.closeResponses += 1;
      events = [
        evResponseCreated(responseId),
        evFunctionCall(CLOSE_CALL_ID, "close_agent", {
          target: agentId ?? mockState.seenAgentIds.at(-1) ?? "missing-agent-id",
        }),
        evCompleted(responseId),
      ];
    } else {
      mockState.finalResponses += 1;
      events = [
        evResponseCreated(responseId),
        evAssistantMessage("msg-parent-final", "A2 app-server diagnostic done."),
        evCompleted(responseId),
      ];
    }

    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    });
    res.end(sse(events));
  });
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const serverUri = `http://127.0.0.1:${port}`;

fs.writeFileSync(
  path.join(codexHome, "config.toml"),
  `
model = "gpt-5.3-codex"
model_provider = "mock_provider"
approval_policy = "never"
sandbox_mode = "workspace-write"

[features]
multi_agent = true

[model_providers.mock_provider]
name = "Mock provider for A2 app-server diagnostic"
base_url = "${serverUri}/v1"
wire_api = "responses"
request_max_retries = 0
stream_max_retries = 0
`,
);

class AppServerClient {
  constructor(label) {
    this.label = label;
    this.nextId = 1;
    this.pending = new Map();
    this.notifications = [];
    this.collabItems = [];
    this.turnCompleted = [];
    this.proc = spawn("codex-rawr", ["app-server"], {
      cwd,
      env: {
        ...process.env,
        CODEX_HOME: codexHome,
        RUST_LOG: "warn",
        LOG_FORMAT: "json",
      },
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.proc.stderr.on("data", (chunk) => {
      fs.appendFileSync(stderrLog, `[${label}] ${chunk.toString("utf8")}`);
    });
    this.rl = readline.createInterface({ input: this.proc.stdout });
    this.rl.on("line", (line) => this.handleLine(line));
  }

  handleLine(line) {
    if (!line.trim()) return;
    const msg = JSON.parse(line);
    fs.appendFileSync(jsonrpcLog, JSON.stringify({ dir: "in", label: this.label, msg }) + "\n");
    if (Object.prototype.hasOwnProperty.call(msg, "id")) {
      const pending = this.pending.get(msg.id);
      if (pending) {
        this.pending.delete(msg.id);
        if (msg.error) pending.reject(new Error(JSON.stringify(msg.error)));
        else pending.resolve(msg.result);
      }
      return;
    }
    this.notifications.push(msg);
    const item = msg.params?.item;
    if (
      (msg.method === "item/started" || msg.method === "item/completed") &&
      item?.type === "collabAgentToolCall"
    ) {
      this.collabItems.push({ method: msg.method, item });
    }
    if (msg.method === "turn/completed") {
      this.turnCompleted.push(msg.params);
    }
  }

  send(method, params) {
    const id = this.nextId++;
    const msg = { jsonrpc: "2.0", id, method, params };
    fs.appendFileSync(jsonrpcLog, JSON.stringify({ dir: "out", label: this.label, msg }) + "\n");
    this.proc.stdin.write(JSON.stringify(msg) + "\n");
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`timeout waiting for ${method}`));
      }, 30000);
    });
  }

  notify(method, params = {}) {
    const msg = { jsonrpc: "2.0", method, params };
    fs.appendFileSync(jsonrpcLog, JSON.stringify({ dir: "out", label: this.label, msg }) + "\n");
    this.proc.stdin.write(JSON.stringify(msg) + "\n");
  }

  async initialize() {
    const result = await this.send("initialize", {
      clientInfo: {
        name: "rawr_a2_appserver_harness",
        title: "RAWR A2 App Server Harness",
        version: "0.0.0",
      },
      capabilities: {
        experimentalApi: true,
      },
    });
    this.notify("initialized");
    return result;
  }

  waitFor(predicate, timeoutMs, label) {
    const started = Date.now();
    return new Promise((resolve, reject) => {
      const tick = () => {
        const value = predicate();
        if (value) return resolve(value);
        if (Date.now() - started > timeoutMs) {
          return reject(new Error(`timeout waiting for ${label}`));
        }
        setTimeout(tick, 100);
      };
      tick();
    });
  }

  async close() {
    this.rl.close();
    this.proc.stdin.end();
    if (!this.proc.killed) this.proc.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => this.proc.once("exit", resolve)),
      new Promise((resolve) =>
        setTimeout(() => {
          try {
            process.kill(this.proc.pid, "SIGKILL");
          } catch {}
          resolve();
        }, 1000),
      ),
    ]);
  }
}

function collectCollabFromThread(thread) {
  const found = [];
  const walk = (value) => {
    if (!value || typeof value !== "object") return;
    if (value.type === "collabAgentToolCall") found.push(value);
    if (Array.isArray(value)) value.forEach(walk);
    else Object.values(value).forEach(walk);
  };
  walk(thread);
  return found;
}

let primary;
let resumed;
try {
  primary = new AppServerClient("primary");
  const initialized = await primary.initialize();
  const threadStart = await primary.send("thread/start", {
    cwd,
    model: "gpt-5.3-codex",
    approvalPolicy: "never",
    sandbox: "workspace-write",
    persistExtendedHistory: true,
  });
  const threadId = threadStart.thread.id;
  const turnStart = await primary.send("turn/start", {
    threadId,
    input: [{ type: "text", text: PARENT_PROMPT, textElements: [] }],
  });
  await primary.waitFor(() => primary.turnCompleted.length >= 1, 30000, "primary turn/completed");
  const primaryRead = await primary.send("thread/read", { threadId, includeTurns: true });
  const primaryHistoryCollab = collectCollabFromThread(primaryRead.thread);

  resumed = new AppServerClient("resumed");
  await resumed.initialize();
  const resumeResult = await resumed.send("thread/resume", { threadId });
  const resumedRead = await resumed.send("thread/read", { threadId, includeTurns: true });
  const loaded = await resumed.send("thread/loaded/list", {});
  const resumedHistoryCollab = collectCollabFromThread(resumedRead.thread);

  const summary = {
    ok: true,
    root,
    codexHome,
    cwd,
    serverUri,
    initialized,
    threadId,
    turnId: turnStart.turn?.id ?? turnStart.turnId ?? null,
    primaryNotificationMethods: primary.notifications.map((n) => n.method),
    primaryLiveCollabItems: primary.collabItems,
    primaryHistoryCollab,
    resumeThreadStatus: resumeResult.thread?.status ?? null,
    loadedAfterResume: loaded,
    resumedHistoryCollab,
    mockState,
    files: { jsonrpcLog, stderrLog, requestsLog, summaryPath },
  };
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  const summary = {
    ok: false,
    error: error?.stack ?? String(error),
    root,
    codexHome,
    cwd,
    serverUri,
    mockState,
    files: { jsonrpcLog, stderrLog, requestsLog, summaryPath },
  };
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} finally {
  if (primary) await primary.close().catch(() => {});
  if (resumed) await resumed.close().catch(() => {});
  await new Promise((resolve) => server.close(resolve));
}
