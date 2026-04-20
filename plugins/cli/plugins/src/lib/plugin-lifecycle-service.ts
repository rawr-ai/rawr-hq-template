import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

import type {
  DecideMergePolicyResult,
  JudgeResult,
  LifecycleCheckData,
  LifecycleType,
  PrContext,
  ScratchPolicyCheck,
  ScratchPolicyMode,
} from "@rawr/hq-ops/types";
import { createHqOpsClient, type HqOpsClient } from "./hq-ops-client";
import { runCommand, tryParseJson } from "./process-execution";

type ResolveOptions = NonNullable<Parameters<HqOpsClient["pluginLifecycle"]["resolveLifecycleTarget"]>[1]>;
type EvaluateOptions = NonNullable<Parameters<HqOpsClient["pluginLifecycle"]["evaluateLifecycleCompleteness"]>[1]>;
type ScratchOptions = NonNullable<Parameters<HqOpsClient["pluginLifecycle"]["checkScratchPolicy"]>[1]>;
type SweepOptions = NonNullable<Parameters<HqOpsClient["pluginLifecycle"]["planSweepCandidates"]>[1]>;
type DecisionOptions = NonNullable<Parameters<HqOpsClient["pluginLifecycle"]["decideMergePolicy"]>[1]>;

/**
 * Normalizes git paths before sending lifecycle evidence to HQ Ops.
 */
function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}

/**
 * Deduplicates local evidence lists for deterministic service requests.
 */
function uniqSorted(items: string[]): string[] {
  return [...new Set(items)].sort((a, b) => a.localeCompare(b));
}

/**
 * Observes whether a path exists before target resolution asks the service to
 * choose among candidates.
 */
async function exists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads a package name only as a local search hint for dependent scanning.
 */
async function readPackageName(targetAbs: string): Promise<string | null> {
  const pkgPath = path.join(targetAbs, "package.json");
  if (!(await exists(pkgPath))) return null;

  try {
    const parsed = JSON.parse(await fs.readFile(pkgPath, "utf8")) as { name?: unknown };
    return typeof parsed.name === "string" ? parsed.name : null;
  } catch {
    return null;
  }
}

/**
 * Resolves lifecycle targets through HQ Ops while supplying concrete path
 * candidates observed by the CLI.
 */
export async function resolveLifecycleTarget(input: {
  workspaceRoot: string;
  target: string;
  type: LifecycleType;
  traceId: string;
}): Promise<LifecycleCheckData["target"] | null> {
  const candidates = uniqSorted([
    path.isAbsolute(input.target) ? path.resolve(input.target) : path.resolve(input.workspaceRoot, input.target),
    path.resolve(process.cwd(), input.target),
  ]);
  const existingPaths: string[] = [];
  for (const candidate of candidates) {
    if (await exists(candidate)) existingPaths.push(candidate);
  }

  const client = createHqOpsClient(input.workspaceRoot);
  const options = {
    context: { invocation: { traceId: input.traceId } },
  } satisfies ResolveOptions;
  const result = await client.pluginLifecycle.resolveLifecycleTarget(
    {
      workspaceRoot: input.workspaceRoot,
      currentWorkingDirectory: process.cwd(),
      target: input.target,
      type: input.type,
      existingPaths,
    },
    options,
  );

  return result.target ?? null;
}

/**
 * Collects the repo file universe used by service lifecycle evidence checks.
 */
export async function gitTrackedFiles(workspaceRoot: string): Promise<string[]> {
  const r = await runCommand("git", ["ls-files"], { cwd: workspaceRoot });
  if (r.exitCode !== 0) return [];
  return uniqSorted(
    r.stdout
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(toPosix),
  );
}

/**
 * Collects local git changes from working tree, index, and recent commits.
 */
export async function collectChangedFiles(workspaceRoot: string, baseRef?: string): Promise<string[]> {
  const out: string[] = [];
  const add = (raw: string) => {
    for (const line of raw.split("\n")) {
      const f = toPosix(line.trim());
      if (f) out.push(f);
    }
  };

  const unstaged = await runCommand("git", ["diff", "--name-only", "--relative"], { cwd: workspaceRoot });
  if (unstaged.exitCode === 0) add(unstaged.stdout);

  const staged = await runCommand("git", ["diff", "--name-only", "--relative", "--cached"], { cwd: workspaceRoot });
  if (staged.exitCode === 0) add(staged.stdout);

  const range = baseRef ? `${baseRef}...HEAD` : "HEAD~1...HEAD";
  const committed = await runCommand("git", ["diff", "--name-only", "--relative", range], { cwd: workspaceRoot });
  if (committed.exitCode === 0) add(committed.stdout);

  return uniqSorted(out);
}

/**
 * Runs projection-owned smoke checks for sync and drift, then reports only the
 * evidence booleans to HQ Ops lifecycle policy.
 */
export async function verifySyncAndDrift(workspaceRoot: string): Promise<{
  syncVerified: boolean;
  driftVerified: boolean;
  driftDetected: boolean;
}> {
  const sync = await runCommand(
    "bun",
    ["run", "rawr", "--", "plugins", "sync", "all", "--dry-run", "--json"],
    { cwd: workspaceRoot, timeoutMs: 120_000 },
  );

  const drift = await runCommand(
    "bun",
    ["run", "rawr", "--", "plugins", "sync", "drift", "--no-fail-on-drift", "--json"],
    { cwd: workspaceRoot, timeoutMs: 120_000 },
  );

  const driftParsed = tryParseJson<{
    data?: { summary?: { inSync?: unknown } };
    summary?: { inSync?: unknown };
  }>(drift.stdout);
  const inSync =
    typeof driftParsed?.data?.summary?.inSync === "boolean"
      ? driftParsed.data.summary.inSync
      : typeof driftParsed?.summary?.inSync === "boolean"
        ? driftParsed.summary.inSync
        : false;

  return {
    syncVerified: sync.exitCode === 0,
    driftVerified: drift.exitCode === 0,
    driftDetected: !inSync,
  };
}

/**
 * Narrows external JSON from judge/gh commands before projection normalization.
 */
function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

/**
 * Normalizes external judge output into the closed service outcome set.
 */
function normalizeJudgeOutcome(input: unknown): JudgeResult["outcome"] {
  if (input === "auto_merge") return "auto_merge";
  if (input === "fix_first") return "fix_first";
  if (input === "policy_escalation") return "policy_escalation";
  return "insufficient_confidence";
}

/**
 * Bounds external judge confidence before sending it to HQ Ops.
 */
function normalizeConfidence(input: unknown): number {
  if (typeof input !== "number" || !Number.isFinite(input)) return 0;
  if (input < 0) return 0;
  if (input > 1) return 1;
  return input;
}

/**
 * Uses ripgrep to find downstream references to the lifecycle target.
 */
export async function scanDependents(
  workspaceRoot: string,
  targetAbs: string,
  repoFiles: string[],
): Promise<string[]> {
  const targetRel = toPosix(path.relative(workspaceRoot, targetAbs));
  const dirName = path.basename(targetAbs);
  const packageName = await readPackageName(targetAbs);
  const tokens = uniqSorted([dirName, packageName ?? ""]).filter((t) => t.length >= 4);

  if (tokens.length === 0) return [];

  const dependentSet = new Set<string>();
  for (const token of tokens) {
    const r = await runCommand(
      "rg",
      [
        "-l",
        "--fixed-strings",
        "--glob",
        "!**/node_modules/**",
        "--glob",
        "!**/dist/**",
        token,
        ".",
      ],
      { cwd: workspaceRoot },
    );

    if (r.exitCode !== 0 && r.exitCode !== 1) continue;

    for (const line of r.stdout.split("\n")) {
      const rel = toPosix(line.trim().replace(/^\.\//, ""));
      if (!rel) continue;
      if (rel === targetRel || rel.startsWith(`${targetRel}/`)) continue;
      if (!repoFiles.includes(rel)) continue;
      dependentSet.add(rel);
    }
  }

  return uniqSorted([...dependentSet]);
}

/**
 * Calls HQ Ops to evaluate lifecycle completeness from local evidence.
 */
export async function evaluateLifecycleCompleteness(input: {
  workspaceRoot: string;
  targetInput: string;
  targetAbs: string;
  type: LifecycleType;
  changedFiles: string[];
  repoFiles: string[];
  syncVerified: boolean;
  driftVerified: boolean;
  driftDetected: boolean;
  traceId: string;
}): Promise<LifecycleCheckData> {
  const client = createHqOpsClient(input.workspaceRoot);
  const options = {
    context: { invocation: { traceId: input.traceId } },
  } satisfies EvaluateOptions;
  return client.pluginLifecycle.evaluateLifecycleCompleteness(
    {
      workspaceRoot: input.workspaceRoot,
      targetInput: input.targetInput,
      targetAbs: input.targetAbs,
      type: input.type,
      changedFiles: input.changedFiles,
      repoFiles: input.repoFiles,
      dependentFiles: await scanDependents(input.workspaceRoot, input.targetAbs, input.repoFiles),
      syncVerified: input.syncVerified,
      driftVerified: input.driftVerified,
      driftDetected: input.driftDetected,
    },
    options,
  );
}

/**
 * Normalizes scratch policy configuration from environment or git config.
 */
function normalizeMode(input: string | null | undefined): ScratchPolicyMode {
  const value = (input ?? "").trim().toLowerCase();
  if (value === "off") return "off";
  if (value === "block") return "block";
  return "warn";
}

/**
 * Reads optional scratch policy configuration from the repo.
 */
function readModeFromGitConfig(workspaceRoot: string): ScratchPolicyMode | null {
  const run = spawnSync("git", ["config", "--get", "rawr.scratchPolicyMode"], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: { ...process.env },
  });
  if ((run.status ?? 1) !== 0) return null;
  const raw = (run.stdout ?? "").trim();
  if (!raw) return null;
  return normalizeMode(raw);
}

/**
 * Finds scratch documents that satisfy lifecycle planning hygiene.
 */
async function collectScratchFiles(root: string, depth: number): Promise<{ planScratch: string[]; workingPad: string[] }> {
  const out = {
    planScratch: [] as string[],
    workingPad: [] as string[],
  };

  if (depth < 0) return out;
  let dirents: Array<{ name: string; isDirectory: () => boolean }>;
  try {
    dirents = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const dirent of dirents) {
    const abs = path.join(root, dirent.name);
    if (dirent.isDirectory()) {
      if (dirent.name === "node_modules" || dirent.name === "dist" || dirent.name.startsWith(".")) continue;
      const nested = await collectScratchFiles(abs, depth - 1);
      out.planScratch.push(...nested.planScratch);
      out.workingPad.push(...nested.workingPad);
      continue;
    }

    if (dirent.name === "PLAN_SCRATCH.md") out.planScratch.push(abs);
    if (dirent.name === "WORKING_PAD.md") out.workingPad.push(abs);
  }

  return out;
}

/**
 * Collects scratch-policy observations and asks HQ Ops to interpret them.
 */
export async function checkScratchPolicy(workspaceRoot: string): Promise<ScratchPolicyCheck> {
  const client = createHqOpsClient(workspaceRoot);
  const options = {
    context: { invocation: { traceId: "plugin-plugins.plugin-lifecycle.scratch-policy" } },
  } satisfies ScratchOptions;

  if (process.env.RAWR_SKIP_SCRATCH_POLICY === "1") {
    return client.pluginLifecycle.checkScratchPolicy(
      {
        mode: "off",
        bypassed: true,
        planScratchPaths: [],
        workingPadPaths: [],
      },
      options,
    );
  }

  const fromGit = readModeFromGitConfig(workspaceRoot);
  const mode = process.env.RAWR_SCRATCH_POLICY_MODE
    ? normalizeMode(process.env.RAWR_SCRATCH_POLICY_MODE)
    : fromGit ?? "warn";
  const found = await collectScratchFiles(path.join(workspaceRoot, "docs", "projects"), 5);
  return client.pluginLifecycle.checkScratchPolicy(
    {
      mode,
      planScratchPaths: found.planScratch,
      workingPadPaths: found.workingPad,
    },
    options,
  );
}

/**
 * Calls HQ Ops to plan lifecycle sweep candidates.
 */
export async function planSweepCandidates(input: {
  workspaceRoot: string;
  explicitTargets?: string[];
  limit: number;
  traceId: string;
}): Promise<Awaited<ReturnType<HqOpsClient["pluginLifecycle"]["planSweepCandidates"]>>> {
  const client = createHqOpsClient(input.workspaceRoot);
  const options = {
    context: { invocation: { traceId: input.traceId } },
  } satisfies SweepOptions;
  return client.pluginLifecycle.planSweepCandidates(
    {
      workspaceRoot: input.workspaceRoot,
      explicitTargets: input.explicitTargets,
      limit: input.limit,
    },
    options,
  );
}

/**
 * Executes an external judge command and normalizes its JSON output.
 */
export async function runJudge(
  judge: "A" | "B",
  commandLine: string | undefined,
  input: Record<string, unknown>,
  cwd: string,
): Promise<JudgeResult> {
  if (!commandLine || commandLine.trim().length === 0) {
    return {
      judge,
      outcome: "insufficient_confidence",
      confidence: 0,
      reason: `judge ${judge} command not configured`,
    };
  }

  const exec = await runCommand("zsh", ["-lc", commandLine], {
    cwd,
    stdin: JSON.stringify(input),
    timeoutMs: 120_000,
  });

  if (exec.exitCode !== 0) {
    return {
      judge,
      outcome: "insufficient_confidence",
      confidence: 0,
      reason: `judge ${judge} command failed (${exec.exitCode})`,
    };
  }

  const parsed = tryParseJson<unknown>(exec.stdout);
  const parsedRecord = asRecord(parsed);
  return {
    judge,
    outcome: normalizeJudgeOutcome(parsedRecord?.outcome),
    confidence: normalizeConfidence(parsedRecord?.confidence),
    reason: typeof parsedRecord?.reason === "string" ? parsedRecord.reason : `judge ${judge} returned no reason`,
  };
}

/**
 * Reads lightweight PR context for merge-policy decisions.
 */
export async function readPrContext(cwd: string): Promise<PrContext> {
  const branchRun = await runCommand("git", ["branch", "--show-current"], { cwd });
  const branch = branchRun.stdout.trim();

  const prView = await runCommand(
    "gh",
    ["pr", "view", "--json", "number,url,comments", "--jq", '{"number":.number,"url":.url,"comments":.comments}'],
    { cwd, timeoutMs: 60_000 },
  );

  if (prView.exitCode !== 0) {
    return {
      branch,
      prNumber: null,
      prUrl: null,
      commentsCount: 0,
      commentsSummary: [],
    };
  }

  const parsed = asRecord(tryParseJson<unknown>(prView.stdout));
  const comments = Array.isArray(parsed?.comments) ? parsed.comments : [];

  return {
    branch,
    prNumber: typeof parsed?.number === "number" ? parsed.number : null,
    prUrl: typeof parsed?.url === "string" ? parsed.url : null,
    commentsCount: comments.length,
    commentsSummary: comments
      .slice(0, 20)
      .map((comment) => {
        const record = asRecord(comment);
        const author = asRecord(record?.author);
        const authorLogin = typeof author?.login === "string" ? author.login : "unknown";
        const body = typeof record?.body === "string" ? record.body.replace(/\s+/g, " ").trim() : "";
        return `${authorLogin}: ${body.slice(0, 160)}`;
      }),
  };
}

/**
 * Calls HQ Ops to decide merge policy from lifecycle, PR, and judge evidence.
 */
export async function decideMergePolicy(input: {
  workspaceRoot: string;
  lifecycle: LifecycleCheckData;
  prContext: PrContext;
  judgeA: JudgeResult;
  judgeB: JudgeResult;
  baseBranch?: string;
  changeUnitId: string;
  traceId: string;
}): Promise<DecideMergePolicyResult> {
  const client = createHqOpsClient(input.workspaceRoot);
  const options = {
    context: { invocation: { traceId: input.traceId } },
  } satisfies DecisionOptions;
  return client.pluginLifecycle.decideMergePolicy(
    {
      lifecycle: input.lifecycle,
      prContext: input.prContext,
      judgeA: {
        outcome: input.judgeA.outcome,
        confidence: input.judgeA.confidence,
        reason: input.judgeA.reason,
      },
      judgeB: {
        outcome: input.judgeB.outcome,
        confidence: input.judgeB.confidence,
        reason: input.judgeB.reason,
      },
      baseBranch: input.baseBranch ?? input.prContext.branch,
      changeUnitId: input.changeUnitId,
    },
    options,
  );
}

export type { DecideMergePolicyResult, JudgeResult, LifecycleCheckData, LifecycleType, PrContext, ScratchPolicyCheck };
