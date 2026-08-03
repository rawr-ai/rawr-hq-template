#!/usr/bin/env node
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";

const evidenceRoot =
  process.env.EVIDENCE_ROOT ??
  path.resolve("services/hyperresearch-codex/spec/evidence/20260503T213000Z-app-server-explicit-child-resume");
const scenarioDir = path.join(evidenceRoot, "explicit-child-resume");
const harnessDir = path.join(evidenceRoot, "harness");
const promptsDir = path.join(evidenceRoot, "prompts");
const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-appserver-explicit-child-"));
const codexHome = path.join(runtimeRoot, "codex-home");
const cwd = path.join(runtimeRoot, "workspace");
const jsonrpcLog = path.join(scenarioDir, "jsonrpc.jsonl");
const stderrLog = path.join(scenarioDir, "app-server.stderr.log");
const requestsLog = path.join(scenarioDir, "mock-responses-requests.jsonl");
const summaryPath = path.join(scenarioDir, "summary.json");
const manifestPath = path.join(evidenceRoot, "manifest.json");
const shaPath = path.join(evidenceRoot, "sha256sums.txt");

for (const dir of [evidenceRoot, scenarioDir, harnessDir, promptsDir, codexHome, cwd]) {
  fs.mkdirSync(dir, { recursive: true });
}

const PARENT_PROMPT =
  "App-server explicit child resume diagnostic: spawn one child agent with message 'explicit child writes deterministic result', then stop. Do not wait or close it yet.";
const RESUME_PROMPT_PREFIX =
  "App-server explicit child resume diagnostic: resume the pre-resume child with EXPLICIT_CHILD_ID=";
const CHILD_PROMPT = "explicit child writes deterministic result";
const SPAWN_CALL_ID = "explicit-spawn-call-1";
const RESUME_CALL_ID = "explicit-resume-call-1";
const WAIT_CALL_ID = "explicit-wait-call-1";
const CLOSE_CALL_ID = "explicit-close-call-1";

fs.writeFileSync(path.join(promptsDir, "parent-initial.md"), `${PARENT_PROMPT}\n`);
fs.writeFileSync(
  path.join(promptsDir, "parent-resume-template.md"),
  `${RESUME_PROMPT_PREFIX}<child-thread-id>, then wait for and close that same child id.\n`,
);

function sse(events) {
  return events.map((ev) => `event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`).join("");
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
  const marked = bodyText.match(/EXPLICIT_CHILD_ID=([0-9a-f-]+)/i);
  if (marked) return marked[1];
  const direct = bodyText.match(/\\"agent_id\\"\s*:\s*\\"([^"\\]+)\\"/);
  if (direct) return direct[1];
  const target = bodyText.match(/\\"target\\"\s*:\s*\\"([^"\\]+)\\"/);
  if (target) return target[1];
  const idArg = bodyText.match(/\\"id\\"\s*:\s*\\"([^"\\]+)\\"/);
  if (idArg) return idArg[1];
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
  resumeResponses: 0,
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

    const responseId = `resp-${mockState.requests}`;
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
        evAssistantMessage("msg-child-1", JSON.stringify({ explicit_child_result: "ok" })),
        evCompleted(responseId),
      ];
    } else if (bodyText.includes(RESUME_PROMPT_PREFIX) && !bodyText.includes(RESUME_CALL_ID)) {
      mockState.resumeResponses += 1;
      events = [
        evResponseCreated(responseId),
        evFunctionCall(RESUME_CALL_ID, "resume_agent", {
          id: agentId ?? mockState.seenAgentIds.at(-1) ?? "missing-agent-id",
        }),
        evCompleted(responseId),
      ];
    } else if (bodyText.includes(RESUME_CALL_ID) && !bodyText.includes(WAIT_CALL_ID)) {
      mockState.waitResponses += 1;
      events = [
        evResponseCreated(responseId),
        evFunctionCall(WAIT_CALL_ID, "wait_agent", {
          targets: [agentId ?? mockState.seenAgentIds.at(-1) ?? "missing-agent-id"],
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
    } else if (bodyText.includes(SPAWN_CALL_ID) && !bodyText.includes(RESUME_PROMPT_PREFIX)) {
      mockState.finalResponses += 1;
      events = [
        evResponseCreated(responseId),
        evAssistantMessage("msg-parent-spawned", "Explicit child spawned; resume later."),
        evCompleted(responseId),
      ];
    } else {
      mockState.finalResponses += 1;
      events = [
        evResponseCreated(responseId),
        evAssistantMessage("msg-parent-final", "Explicit child resume diagnostic done."),
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
name = "Mock provider for explicit app-server child resume diagnostic"
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
        name: "rawr_explicit_child_resume_harness",
        title: "RAWR Explicit Child Resume Harness",
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

function completedTool(items, toolName) {
  return items
    .map((entry) => entry.item)
    .find((item) => item.tool === toolName && item.status === "completed");
}

function failedTool(items, toolName) {
  return items.map((entry) => entry.item).find((item) => item.tool === toolName && item.status === "failed");
}

function statusFor(item, childThreadId) {
  return item?.agentsStates?.[childThreadId]?.status ?? null;
}

function collectToolOutputsFromRequests() {
  if (!fs.existsSync(requestsLog)) return {};
  const outputs = {};
  const walk = (value) => {
    if (!value || typeof value !== "object") return;
    if (value.type === "function_call_output" && value.call_id && value.output) {
      try {
        outputs[value.call_id] = JSON.parse(value.output);
      } catch {
        outputs[value.call_id] = value.output;
      }
    }
    if (Array.isArray(value)) value.forEach(walk);
    else Object.values(value).forEach(walk);
  };

  const lines = fs.readFileSync(requestsLog, "utf8").trim().split(/\n/).filter(Boolean);
  for (const line of lines) {
    walk(JSON.parse(line).body);
  }
  return outputs;
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function writeShaSums() {
  const files = [
    "manifest.json",
    "prompts/parent-initial.md",
    "prompts/parent-resume-template.md",
    "explicit-child-resume/jsonrpc.jsonl",
    "explicit-child-resume/app-server.stderr.log",
    "explicit-child-resume/mock-responses-requests.jsonl",
    "explicit-child-resume/summary.json",
    "harness/app-server-cold-resume-explicit-child-resume-harness.mjs",
  ];
  const lines = files
    .filter((relative) => fs.existsSync(path.join(evidenceRoot, relative)))
    .map((relative) => `${sha256(path.join(evidenceRoot, relative))}  ${relative}`)
    .join("\n");
  fs.writeFileSync(shaPath, `${lines}\n`);
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
  await primary.waitFor(
    () => primary.turnCompleted.length >= 2 && mockState.childResponses >= 1,
    30000,
    "primary parent and child turn/completed",
  );
  const primaryRead = await primary.send("thread/read", { threadId, includeTurns: true });
  const primaryHistoryCollab = collectCollabFromThread(primaryRead.thread);
  const childThreadId = completedTool(primary.collabItems, "spawnAgent")?.receiverThreadIds?.[0];
  if (!childThreadId) {
    throw new Error("spawn completed without a child thread id");
  }
  fs.writeFileSync(
    path.join(promptsDir, "parent-resume.md"),
    `${RESUME_PROMPT_PREFIX}${childThreadId}, then wait for and close that same child id.\n`,
  );
  const primaryNotificationMethods = primary.notifications.map((n) => n.method);
  const primaryLiveCollabItems = primary.collabItems;
  await primary.close();
  primary = null;

  resumed = new AppServerClient("resumed");
  await resumed.initialize();
  const resumeResult = await resumed.send("thread/resume", { threadId });
  const resumeTurnStart = await resumed.send("turn/start", {
    threadId,
    input: [
      {
        type: "text",
        text: `${RESUME_PROMPT_PREFIX}${childThreadId}, then wait for and close that same child id.`,
        textElements: [],
      },
    ],
  });
  await resumed.waitFor(
    () => resumed.turnCompleted.length >= 1 && resumed.collabItems.length >= 6,
    30000,
    "resumed resume/wait/close collab completions",
  );
  const resumedRead = await resumed.send("thread/read", { threadId, includeTurns: true });
  const loaded = await resumed.send("thread/loaded/list", {});
  const resumedHistoryCollab = collectCollabFromThread(resumedRead.thread);

  const resumeCompleted = completedTool(resumed.collabItems, "resumeAgent");
  const resumeFailed = failedTool(resumed.collabItems, "resumeAgent");
  const waitCompleted = completedTool(resumed.collabItems, "wait");
  const waitFailed = failedTool(resumed.collabItems, "wait");
  const closeCompleted = completedTool(resumed.collabItems, "closeAgent");
  const closeFailed = failedTool(resumed.collabItems, "closeAgent");
  const toolOutputs = collectToolOutputsFromRequests();
  const resumeOutput = toolOutputs[RESUME_CALL_ID] ?? null;
  const waitOutput = toolOutputs[WAIT_CALL_ID] ?? null;
  const closeOutput = toolOutputs[CLOSE_CALL_ID] ?? null;
  const notFoundStatuses = resumed.collabItems
    .map((entry) => entry.item)
    .flatMap((item) =>
      Object.entries(item.agentsStates ?? {})
        .filter(([, state]) => state?.status === "notFound")
        .map(([threadId]) => ({ tool: item.tool, threadId })),
    );
  const resumeRecoveredHandle =
    resumeOutput && !["not_found", "notFound"].includes(resumeOutput.status);
  const waitObservedFinal =
    waitOutput &&
    waitOutput.timed_out === false &&
    Object.prototype.hasOwnProperty.call(waitOutput.status ?? {}, childThreadId);
  const closeAddressedChild =
    closeOutput &&
    !["not_found", "notFound"].includes(closeOutput.previous_status);
  const passed =
    Boolean(resumeCompleted) &&
    Boolean(waitCompleted) &&
    Boolean(closeCompleted) &&
    !resumeFailed &&
    !waitFailed &&
    !closeFailed &&
    notFoundStatuses.length === 0 &&
    resumeRecoveredHandle &&
    waitObservedFinal &&
    closeAddressedChild;
  const classification = passed
    ? "explicit_child_resume_recovered_clean_completion"
    : notFoundStatuses.length > 0
      ? "explicit_child_resume_failed_not_found"
      : resumeRecoveredHandle && waitOutput?.timed_out === true
        ? "explicit_child_resume_recovered_handle_wait_timed_out"
        : resumeRecoveredHandle && closeAddressedChild
          ? "explicit_child_resume_recovered_handle_only"
          : "explicit_child_resume_failed";

  const summary = {
    ok: true,
    passed,
    classification,
    root: runtimeRoot,
    codexHome,
    cwd,
    serverUri,
    initialized,
    threadId,
    childThreadId,
    turnId: turnStart.turn?.id ?? turnStart.turnId ?? null,
    resumeTurnId: resumeTurnStart.turn?.id ?? resumeTurnStart.turnId ?? null,
    primaryNotificationMethods,
    primaryLiveCollabItems,
    primaryHistoryCollab,
    resumeThreadStatus: resumeResult.thread?.status ?? null,
    loadedAfterResume: loaded,
    resumedLiveCollabItems: resumed.collabItems,
    resumedHistoryCollab,
    resumeStatus: statusFor(resumeCompleted ?? resumeFailed, childThreadId),
    waitStatus: statusFor(waitCompleted ?? waitFailed, childThreadId),
    closeStatus: statusFor(closeCompleted ?? closeFailed, childThreadId),
    toolOutputs,
    resumeRecoveredHandle,
    waitObservedFinal,
    closeAddressedChild,
    notFoundStatuses,
    mockState,
    files: { jsonrpcLog, stderrLog, requestsLog, summaryPath, manifestPath, shaPath },
  };
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        schemaVersion: 1,
        surface: "codex app-server",
        transport: "stdio",
        threadResumeMode: "cold_resume_explicit_child_resume",
        passed,
        classification,
        rawJsonRpcLog: "explicit-child-resume/jsonrpc.jsonl",
        collabEventsObserved: true,
        directChildLifecycleApiObserved: false,
        parentThreadId: threadId,
        originalChildThreadIds: [childThreadId],
        threadReadIncludedTurns: true,
        loadedThreadIdsAfterResume: loaded.data ?? [],
        collabToolsObserved: resumed.collabItems.map((entry) => entry.item.tool),
        toolOutputs,
        resumeRecoveredHandle,
        waitObservedFinal,
        closeAddressedChild,
        notFoundStatuses,
        summary: "explicit-child-resume/summary.json",
      },
      null,
      2,
    ),
  );
  writeShaSums();
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  const summary = {
    ok: false,
    passed: false,
    classification: "explicit_child_resume_harness_error",
    error: error?.stack ?? String(error),
    root: runtimeRoot,
    codexHome,
    cwd,
    serverUri,
    mockState,
    files: { jsonrpcLog, stderrLog, requestsLog, summaryPath, manifestPath, shaPath },
  };
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        schemaVersion: 1,
        surface: "codex app-server",
        transport: "stdio",
        threadResumeMode: "cold_resume_explicit_child_resume",
        passed: false,
        classification: summary.classification,
        error: summary.error,
        summary: "explicit-child-resume/summary.json",
      },
      null,
      2,
    ),
  );
  writeShaSums();
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} finally {
  if (primary) await primary.close().catch(() => {});
  if (resumed) await resumed.close().catch(() => {});
  await new Promise((resolve) => server.close(resolve));
}
