import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const HQ_OPEN_POLICIES = ["none", "app", "app+inngest", "all"] as const;
export type HqOpenPolicy = (typeof HQ_OPEN_POLICIES)[number];

export const HQ_OBSERVABILITY_MODES = ["auto", "required", "off"] as const;
export type HqObservabilityMode = (typeof HQ_OBSERVABILITY_MODES)[number];

export const HQ_SUMMARIES = ["running", "degraded", "partial", "stopped"] as const;
export type HqSummary = (typeof HQ_SUMMARIES)[number];

export const HQ_MANAGER_STATES = ["running", "stopped", "stale"] as const;
export type HqManagerState = (typeof HQ_MANAGER_STATES)[number];

export const HQ_ROLE_STATES = ["running", "stopped", "degraded", "unknown"] as const;
export type HqRoleState = (typeof HQ_ROLE_STATES)[number];

export const HQ_OWNERSHIP_VALUES = ["managed", "unmanaged", "mixed", "unknown"] as const;
export type HqOwnership = (typeof HQ_OWNERSHIP_VALUES)[number];

export const HQ_OBSERVABILITY_STATES = [
  "running",
  "disabled",
  "managed-stopped",
  "degraded-start-failed",
  "degraded-not-ready",
  "degraded-missing-docker",
  "degraded-port-conflict",
  "degraded-unavailable",
] as const;
export type HqObservabilityState = (typeof HQ_OBSERVABILITY_STATES)[number];

function isHqObservabilityMode(value: string): value is HqObservabilityMode {
  return (HQ_OBSERVABILITY_MODES as readonly string[]).includes(value);
}

function formatObservabilityModeError(value: string, source: string): string {
  return `invalid ${source} '${value}' (expected one of: ${HQ_OBSERVABILITY_MODES.join(", ")})`;
}

function resolveObservabilityMode(args: {
  mode?: HqObservabilityMode;
  stateMode?: HqObservabilityMode | null;
  env: NodeJS.ProcessEnv;
}): HqObservabilityMode {
  if (args.mode) {
    return args.mode;
  }

  if (args.stateMode) {
    return args.stateMode;
  }

  const envValue = args.env.RAWR_HQ_OBSERVABILITY?.trim();
  if (!envValue) {
    return "auto";
  }

  if (isHqObservabilityMode(envValue)) {
    return envValue;
  }

  throw new Error(formatObservabilityModeError(envValue, "RAWR_HQ_OBSERVABILITY"));
}

type HqRemediation = {
  code: string;
  message: string;
  command?: string;
};

type HqPortStatus = {
  port: number;
  listening: boolean;
  listenerPids: number[];
  ownership: HqOwnership;
};

type HqHealthStatus = {
  url: string;
  ok: boolean;
};

type HqRoleStatus = {
  state: HqRoleState;
  expected: boolean;
  pid: number | null;
  implementation?: string;
  ports: HqPortStatus[];
  health: HqHealthStatus | null;
};

type HqObservabilityStatus = {
  mode: HqObservabilityMode;
  backend: "hyperdx";
  state: HqObservabilityState;
  containerName: string;
  urls: {
    ui: string;
    otlpHttp: string;
  };
  ports: HqPortStatus[];
  remediation: HqRemediation[];
};

export type HqStatus = {
  schemaVersion: 1;
  checkedAt: string;
  workspaceRoot: string;
  summary: HqSummary;
  manager: {
    state: HqManagerState;
    pid: number | null;
    startedAt: string | null;
    stale: boolean;
  };
  roles: {
    server: HqRoleStatus;
    async: HqRoleStatus;
    web: HqRoleStatus;
  };
  support: {
    observability: HqObservabilityStatus;
  };
  artifacts: {
    statusFile: ".rawr/hq/status.json";
    logFile: ".rawr/hq/runtime.log";
    stateFile: ".rawr/hq/state.env";
  };
  remediation: HqRemediation[];
};

type HqStateFile = {
  managerPid: number | null;
  serverPid: number | null;
  webPid: number | null;
  asyncPid: number | null;
  asyncEnabled: boolean | null;
  startedAt: string | null;
  openPolicy: HqOpenPolicy | null;
  observabilityMode: HqObservabilityMode | null;
};

const HQ_ARTIFACT_DIR = ".rawr/hq";
const HQ_ARTIFACTS = {
  statusFile: ".rawr/hq/status.json" as const,
  logFile: ".rawr/hq/runtime.log" as const,
  stateFile: ".rawr/hq/state.env" as const,
};

const HQ_URLS = {
  web: "http://localhost:5173/",
  serverHealth: "http://localhost:3000/health",
  asyncRuns: "http://localhost:8288/runs",
  observabilityUi: "http://localhost:8080/",
  observabilityOtlp: "http://127.0.0.1:4318",
};

const HQ_PORTS = {
  server: 3000,
  web: 5173,
  async: 8288,
  observabilityUi: 8080,
  observabilityOtlp: 4318,
};

function commandExists(command: string): boolean {
  const proc = spawnSync("sh", ["-lc", `command -v ${command} >/dev/null 2>&1`], {
    encoding: "utf8",
  });
  return proc.status === 0;
}

function parsePid(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function isPidRunning(pid: number | null): boolean {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function parseOpenPolicy(value: string | undefined): HqOpenPolicy | null {
  if (!value) return null;
  return (HQ_OPEN_POLICIES as readonly string[]).includes(value) ? (value as HqOpenPolicy) : null;
}

function parseObservabilityMode(value: string | undefined): HqObservabilityMode | null {
  if (!value) return null;
  return isHqObservabilityMode(value) ? value : null;
}

function parseBooleanFlag(value: string | undefined): boolean | null {
  if (value === "1") return true;
  if (value === "0") return false;
  return null;
}

async function ensureArtifactDir(workspaceRoot: string): Promise<void> {
  await fs.mkdir(path.join(workspaceRoot, HQ_ARTIFACT_DIR), { recursive: true });
}

function getArtifactPaths(workspaceRoot: string) {
  return {
    statusFile: path.join(workspaceRoot, HQ_ARTIFACTS.statusFile),
    logFile: path.join(workspaceRoot, HQ_ARTIFACTS.logFile),
    stateFile: path.join(workspaceRoot, HQ_ARTIFACTS.stateFile),
  };
}

async function readStateFile(workspaceRoot: string): Promise<HqStateFile | null> {
  const { stateFile } = getArtifactPaths(workspaceRoot);
  let raw: string;
  try {
    raw = await fs.readFile(stateFile, "utf8");
  } catch {
    return null;
  }

  const parsed = new Map<string, string>();
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    parsed.set(trimmed.slice(0, eqIndex), trimmed.slice(eqIndex + 1));
  }

  return {
    managerPid: parsePid(parsed.get("hq_manager_pid")),
    serverPid: parsePid(parsed.get("hq_server_pid")),
    webPid: parsePid(parsed.get("hq_web_pid")),
    asyncPid: parsePid(parsed.get("hq_async_pid")),
    asyncEnabled: parseBooleanFlag(parsed.get("hq_async_enabled")),
    startedAt: parsed.get("hq_started_at") ?? null,
    openPolicy: parseOpenPolicy(parsed.get("hq_open_policy")),
    observabilityMode: parseObservabilityMode(parsed.get("hq_observability_mode")),
  };
}

function collectManagedPids(state: HqStateFile | null): number[] {
  if (!state) return [];
  const roots = [state.managerPid, state.serverPid, state.webPid, state.asyncPid].filter((value): value is number => value !== null);
  const managed = new Set<number>();

  // Child/grandchild processes inherit managed runtime ownership even when a
  // wrapper PID is not the direct socket listener that status probes observe.
  for (const pid of roots) {
    for (const relatedPid of collectPidClosure(pid)) {
      managed.add(relatedPid);
    }
  }

  return [...managed];
}

function collectPidClosure(rootPid: number): number[] {
  const seen = new Set<number>();

  const visit = (pid: number) => {
    if (seen.has(pid)) return;
    seen.add(pid);
    for (const child of getChildPids(pid)) {
      visit(child);
    }
  };

  visit(rootPid);
  return [...seen];
}

function getChildPids(pid: number): number[] {
  if (!commandExists("pgrep")) {
    return [];
  }

  const proc = spawnSync("pgrep", ["-P", String(pid)], { encoding: "utf8" });
  if (proc.status !== 0 && proc.stdout.trim() === "") {
    return [];
  }

  return proc.stdout
    .split(/\r?\n/)
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isInteger(value) && value > 0);
}

function getListenerPids(port: number): { listenerPids: number[]; unknownOwnership: boolean } {
  if (commandExists("lsof")) {
    const proc = spawnSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], {
      encoding: "utf8",
    });
    const listenerPids = proc.stdout
      .split(/\r?\n/)
      .map((value) => Number.parseInt(value.trim(), 10))
      .filter((value) => Number.isInteger(value) && value > 0);
    return { listenerPids: Array.from(new Set(listenerPids)), unknownOwnership: false };
  }

  if (commandExists("ss")) {
    const proc = spawnSync("sh", ["-lc", `ss -ltnp 2>/dev/null | awk '$4 ~ /:${port}$/ { print $0 }'`], {
      encoding: "utf8",
    });
    const lines = proc.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return { listenerPids: [], unknownOwnership: lines.length > 0 };
  }

  if (commandExists("netstat")) {
    const proc = spawnSync("sh", ["-lc", `netstat -an 2>/dev/null | awk '$4 ~ /\\.${port}$/ && /LISTEN/ { print $0 }'`], {
      encoding: "utf8",
    });
    const lines = proc.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return { listenerPids: [], unknownOwnership: lines.length > 0 };
  }

  return { listenerPids: [], unknownOwnership: false };
}

function deriveOwnership(listenerPids: number[], unknownOwnership: boolean, managedPids: number[]): HqOwnership {
  if (listenerPids.length === 0) {
    return unknownOwnership ? "unknown" : "unknown";
  }

  const managed = listenerPids.filter((pid) => managedPids.includes(pid));
  const unmanaged = listenerPids.filter((pid) => !managedPids.includes(pid));

  if (managed.length > 0 && unmanaged.length === 0) return "managed";
  if (managed.length === 0 && unmanaged.length > 0) return "unmanaged";
  if (managed.length > 0 && unmanaged.length > 0) return "mixed";
  return unknownOwnership ? "unknown" : "unknown";
}

async function probeHealth(url: string): Promise<HqHealthStatus> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 500);
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });
    return { url, ok: response.ok };
  } catch {
    return { url, ok: false };
  } finally {
    clearTimeout(timeout);
  }
}

function deriveRoleState(args: {
  expected: boolean;
  pid: number | null;
  portStatus: HqPortStatus;
  health: HqHealthStatus | null;
}): HqRoleState {
  if (!args.expected) return "stopped";

  const pidLive = isPidRunning(args.pid);
  const listening = args.portStatus.listening;
  const ownership = args.portStatus.ownership;
  const healthOk = args.health ? args.health.ok : true;

  if (!pidLive && !listening) return "stopped";
  if (pidLive && listening && ownership === "managed" && healthOk) return "running";
  if (!pidLive && listening && ownership === "unknown") return "unknown";
  return "degraded";
}

async function collectRoleStatus(args: {
  expected: boolean;
  pid: number | null;
  port: number;
  healthUrl: string | null;
  implementation?: string;
  managedPids: number[];
}): Promise<HqRoleStatus> {
  const listeners = getListenerPids(args.port);
  const ownership = deriveOwnership(listeners.listenerPids, listeners.unknownOwnership, args.managedPids);
  const portStatus: HqPortStatus = {
    port: args.port,
    listening: listeners.listenerPids.length > 0 || listeners.unknownOwnership,
    listenerPids: listeners.listenerPids,
    ownership,
  };
  const health = args.healthUrl ? await probeHealth(args.healthUrl) : null;

  return {
    state: deriveRoleState({ expected: args.expected, pid: args.pid, portStatus, health }),
    expected: args.expected,
    pid: isPidRunning(args.pid) ? args.pid : null,
    implementation: args.implementation,
    ports: [portStatus],
    health,
  };
}

function getDockerContainerState(containerName: string): { available: boolean; running: boolean; exists: boolean } {
  if (!commandExists("docker")) {
    return { available: false, running: false, exists: false };
  }

  const runningProc = spawnSync("docker", ["inspect", "--format", "{{.State.Running}}", containerName], {
    encoding: "utf8",
  });
  if (runningProc.status === 0) {
    return {
      available: true,
      running: runningProc.stdout.trim() === "true",
      exists: true,
    };
  }

  const existsProc = spawnSync("docker", ["inspect", containerName], { encoding: "utf8" });
  return {
    available: true,
    running: false,
    exists: existsProc.status === 0,
  };
}

function dedupeRemediation(items: HqRemediation[]): HqRemediation[] {
  const seen = new Set<string>();
  const deduped: HqRemediation[] = [];
  for (const item of items) {
    const key = `${item.code}:${item.command ?? ""}:${item.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

async function collectObservabilityStatus(args: {
  mode: HqObservabilityMode;
  managerState: HqManagerState;
  managedPids: number[];
}): Promise<HqObservabilityStatus> {
  const docker = getDockerContainerState("rawr-hq-hyperdx");
  const ports = [HQ_PORTS.observabilityUi, HQ_PORTS.observabilityOtlp].map((port) => {
    const listeners = getListenerPids(port);
    const ownership = docker.running && (listeners.listenerPids.length > 0 || listeners.unknownOwnership)
      ? "managed"
      : deriveOwnership(listeners.listenerPids, listeners.unknownOwnership, args.managedPids);
    return {
      port,
      listening: listeners.listenerPids.length > 0 || listeners.unknownOwnership,
      listenerPids: listeners.listenerPids,
      ownership,
    } satisfies HqPortStatus;
  });

  const remediation: HqRemediation[] = [];
  let state: HqObservabilityState;

  if (args.mode === "off") {
    state = "disabled";
  } else if (args.managerState !== "running") {
    state = "managed-stopped";
    remediation.push({
      code: "START_HQ_RUNTIME",
      message: "Start the HQ runtime before expecting managed observability support.",
      command: "rawr hq up",
    });
  } else {
    const hasPortConflict = ports.some((port) => port.listening && port.ownership !== "unknown" && port.ownership !== "managed");

    if (!docker.available) {
      state = "degraded-missing-docker";
      remediation.push({
        code: "START_DOCKER",
        message: "Docker is required to manage the local HyperDX support stack.",
      });
    } else if (hasPortConflict) {
      state = "degraded-port-conflict";
      remediation.push({
        code: "FREE_OBSERVABILITY_PORTS",
        message: "Free ports 8080 and 4318 or stop the conflicting observability process.",
      });
    } else if (docker.running && ports.every((port) => port.listening)) {
      state = "running";
    } else if (docker.exists) {
      state = docker.running ? "degraded-not-ready" : "degraded-start-failed";
      remediation.push({
        code: "START_HYPERDX",
        message: "Start the local HyperDX container before requiring observability.",
        command: "docker start rawr-hq-hyperdx",
      });
    } else {
      state = "degraded-unavailable";
      remediation.push({
        code: "PROVISION_HYPERDX",
        message: "Create the local HyperDX container named rawr-hq-hyperdx before requiring observability.",
        command: "docker run -d --name rawr-hq-hyperdx -p 8080:8080 -p 4318:4318 docker.hyperdx.io/hyperdx/hyperdx-local",
      });
    }
  }

  if (args.mode === "auto" && state !== "running" && state !== "disabled") {
    remediation.push({
      code: "RERUN_WITH_REQUIRED_OBSERVABILITY",
      message: "Rerun with required observability when traces, metrics, and logging are needed.",
      command: "rawr hq up --observability required",
    });
  }

  return {
    mode: args.mode,
    backend: "hyperdx",
    state,
    containerName: "rawr-hq-hyperdx",
    urls: {
      ui: HQ_URLS.observabilityUi,
      otlpHttp: HQ_URLS.observabilityOtlp,
    },
    ports,
    remediation: dedupeRemediation(remediation),
  };
}

function deriveSummary(args: {
  roles: Array<HqRoleStatus>;
  observability: HqObservabilityStatus;
}): HqSummary {
  const roleStates = args.roles.filter((role) => role.expected).map((role) => role.state);
  if (roleStates.length === 0) return "stopped";
  if (roleStates.every((state) => state === "stopped")) return "stopped";
  if (roleStates.some((state) => state === "degraded")) return "degraded";
  if (roleStates.every((state) => state === "running")) {
    return args.observability.state === "running" || args.observability.state === "disabled" ? "running" : "degraded";
  }
  if (roleStates.some((state) => state === "running")) return "partial";
  return "stopped";
}

export async function collectHqStatus(args: {
  workspaceRoot: string;
  mode?: HqObservabilityMode;
}): Promise<HqStatus> {
  const workspaceRoot = path.resolve(args.workspaceRoot);
  const { stateFile } = getArtifactPaths(workspaceRoot);
  const state = await readStateFile(workspaceRoot);
  // Prefer the last successful runtime posture from state.env so `hq status`
  // reports the active HQ mode instead of falling back to the auto default.
  const requestedMode = resolveObservabilityMode({
    mode: args.mode,
    stateMode: state?.observabilityMode ?? null,
    env: process.env,
  });
  const managedPids = collectManagedPids(state);
  const anyManagedPidLive = managedPids.some((pid) => isPidRunning(pid));
  const stale = Boolean(state) && !anyManagedPidLive;

  if (stale) {
    await fs.rm(stateFile, { force: true });
  }

  const effectiveState = stale ? null : state;
  const effectiveManagedPids = collectManagedPids(effectiveState);
  const asyncExpected = effectiveState?.asyncEnabled ?? true;

  const roles = {
    server: await collectRoleStatus({
      expected: true,
      pid: effectiveState?.serverPid ?? null,
      port: HQ_PORTS.server,
      healthUrl: HQ_URLS.serverHealth,
      managedPids: effectiveManagedPids,
    }),
    async: await collectRoleStatus({
      expected: asyncExpected,
      pid: asyncExpected ? effectiveState?.asyncPid ?? null : null,
      port: HQ_PORTS.async,
      healthUrl: asyncExpected ? HQ_URLS.asyncRuns : null,
      implementation: "inngest",
      managedPids: effectiveManagedPids,
    }),
    web: await collectRoleStatus({
      expected: true,
      pid: effectiveState?.webPid ?? null,
      port: HQ_PORTS.web,
      healthUrl: HQ_URLS.web,
      managedPids: effectiveManagedPids,
    }),
  };

  const managerState: HqManagerState = stale
    ? "stale"
    : isPidRunning(effectiveState?.managerPid ?? null)
      ? "running"
      : "stopped";

  const observability = await collectObservabilityStatus({
    mode: requestedMode,
    managerState,
    managedPids: effectiveManagedPids,
  });

  const remediation: HqRemediation[] = [
    ...Object.values(roles)
      .filter((role) => role.state !== "running")
      .map((role) => ({
        code: "CHECK_ROLE_STATUS",
        message: `Inspect ${role.implementation ?? "runtime"} role state before treating HQ as healthy.`,
        command: "rawr hq status --json",
      })),
    ...observability.remediation,
  ];

  return {
    schemaVersion: 1,
    checkedAt: new Date().toISOString(),
    workspaceRoot,
    summary: deriveSummary({ roles: Object.values(roles), observability }),
    manager: {
      state: managerState,
      pid: isPidRunning(effectiveState?.managerPid ?? null) ? (effectiveState?.managerPid ?? null) : null,
      startedAt: effectiveState?.startedAt ?? state?.startedAt ?? null,
      stale,
    },
    roles,
    support: {
      observability,
    },
    artifacts: {
      statusFile: HQ_ARTIFACTS.statusFile,
      logFile: HQ_ARTIFACTS.logFile,
      stateFile: HQ_ARTIFACTS.stateFile,
    },
    remediation: dedupeRemediation(remediation),
  };
}

export async function writeHqStatus(status: HqStatus): Promise<void> {
  await ensureArtifactDir(status.workspaceRoot);
  const { statusFile } = getArtifactPaths(status.workspaceRoot);
  await fs.writeFile(statusFile, `${JSON.stringify(status, null, 2)}\n`, "utf8");
}

export async function collectAndWriteHqStatus(args: {
  workspaceRoot: string;
  mode?: HqObservabilityMode;
}): Promise<HqStatus> {
  const status = await collectHqStatus(args);
  await writeHqStatus(status);
  return status;
}

export function formatHqStatusHuman(status: HqStatus): string {
  const lines = [
    `summary: ${status.summary}`,
    `manager: ${status.manager.state}${status.manager.pid ? ` (pid ${status.manager.pid})` : ""}${status.manager.stale ? " [stale]" : ""}`,
    `server: ${status.roles.server.state}${status.roles.server.pid ? ` (pid ${status.roles.server.pid})` : ""}`,
    `async: ${status.roles.async.state}${status.roles.async.pid ? ` (pid ${status.roles.async.pid})` : ""}`,
    `web: ${status.roles.web.state}${status.roles.web.pid ? ` (pid ${status.roles.web.pid})` : ""}`,
    `observability: ${status.support.observability.state} (${status.support.observability.mode})`,
    `status file: ${status.artifacts.statusFile}`,
    `log file: ${status.artifacts.logFile}`,
    `state file: ${status.artifacts.stateFile}`,
  ];

  if (status.remediation.length > 0) {
    lines.push("remediation:");
    for (const item of status.remediation) {
      lines.push(`  - ${item.message}${item.command ? ` (${item.command})` : ""}`);
    }
  }

  return lines.join("\n");
}

function parseCliArgs(argv: string[]): {
  workspaceRoot: string;
  mode: HqObservabilityMode | undefined;
  write: boolean;
  quiet: boolean;
} {
  let workspaceRoot = process.cwd();
  let mode: HqObservabilityMode | undefined;
  let write = false;
  let quiet = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--workspace-root") {
      workspaceRoot = argv[index + 1] ?? workspaceRoot;
      index += 1;
      continue;
    }
    if (arg === "--mode") {
      const next = argv[index + 1];
      if (!next) {
        throw new Error("missing value for --mode");
      }
      if (!isHqObservabilityMode(next)) {
        throw new Error(formatObservabilityModeError(next, "--mode"));
      }
      mode = next;
      index += 1;
      continue;
    }
    if (arg === "--write") {
      write = true;
      continue;
    }
    if (arg === "--quiet") {
      quiet = true;
    }
  }

  return { workspaceRoot, mode, write, quiet };
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const status = args.write ? await collectAndWriteHqStatus(args) : await collectHqStatus(args);
  if (!args.quiet) {
    console.log(JSON.stringify(status, null, 2));
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const currentPath = fileURLToPath(import.meta.url);
if (invokedPath === currentPath) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
