export type LifecycleType = "cli" | "web" | "agent" | "skill" | "workflow" | "composed";

export type LifecycleCheckStatus = "pass" | "fail";

export type JudgeOutcome = "auto_merge" | "fix_first" | "policy_escalation" | "insufficient_confidence";

export type MergeDecision = "auto_merge" | "fix_first" | "policy_escalation" | "hold";

export type LifecycleWorkspacePlugin = {
  id: string;
  name?: string;
  dirName: string;
  absPath: string;
  kind: string;
  capability?: string;
};

export type LifecycleTarget = {
  input: string;
  absPath: string;
  relPath: string;
  type: LifecycleType;
};

export type ResolveLifecycleTargetInput = {
  workspaceRoot?: string;
  currentWorkingDirectory?: string;
  target: string;
  type: LifecycleType;
  workspacePlugins?: LifecycleWorkspacePlugin[];
  existingPaths?: string[];
};

export type ResolveLifecycleTargetResult = {
  found: boolean;
  target?: LifecycleTarget;
  candidates: string[];
  reason?: string;
};

export type LifecycleCheckData = {
  status: LifecycleCheckStatus;
  target: LifecycleTarget;
  missingTests: string[];
  missingDocs: string[];
  missingDependents: string[];
  syncVerified: boolean;
  driftVerified: boolean;
  driftDetected: boolean;
  details: {
    changedFilesConsidered: string[];
    relevantChangedFiles: string[];
    dependentFiles: string[];
    codeChanged: string[];
    testChanged: string[];
    docsChanged: string[];
  };
};

export type EvaluateLifecycleCompletenessInput = {
  workspaceRoot?: string;
  targetInput: string;
  targetAbs: string;
  type: LifecycleType;
  changedFiles: string[];
  repoFiles: string[];
  dependentFiles?: string[];
  syncVerified: boolean;
  driftVerified: boolean;
  driftDetected: boolean;
};

export type ScratchPolicyMode = "off" | "warn" | "block";

export type ScratchPolicyCheckInput = {
  mode?: ScratchPolicyMode;
  bypassed?: boolean;
  planScratchPaths: string[];
  workingPadPaths: string[];
};

export type ScratchPolicyCheck = {
  mode: ScratchPolicyMode;
  bypassed: boolean;
  required: {
    planScratch: boolean;
    workingPad: boolean;
  };
  missing: string[];
  matches: {
    planScratchPaths: string[];
    workingPadPaths: string[];
  };
};

export type RawJudgeResultInput = {
  outcome?: string;
  confidence?: number;
  reason?: string;
  raw?: unknown;
};

export type JudgeResult = {
  judge: "A" | "B";
  outcome: JudgeOutcome;
  confidence: number;
  reason: string;
  raw?: unknown;
};

export type PrContextInput = {
  branch?: string;
  prNumber?: number | null;
  prUrl?: string | null;
  commentsCount?: number;
  commentsSummary?: string[];
};

export type PrContext = {
  branch: string;
  prNumber: number | null;
  prUrl: string | null;
  commentsCount: number;
  commentsSummary: string[];
};

export type PolicyAssessment = {
  judge1: JudgeResult;
  judge2: JudgeResult;
  consensus: MergeDecision;
  confidence: number;
};

export type DecideMergePolicyInput = {
  lifecycle: LifecycleCheckData;
  prContext?: PrContextInput;
  judgeA?: RawJudgeResultInput;
  judgeB?: RawJudgeResultInput;
  baseBranch?: string;
  changeUnitId?: string;
  nowIso?: string;
};

export type FixSlicePlan = {
  branchName: string;
};

export type DecideMergePolicyResult = {
  prContext: PrContext;
  policyAssessment: PolicyAssessment;
  decision: MergeDecision;
  fixSlicePlan?: FixSlicePlan;
};

type PathOps = {
  resolve(...parts: string[]): string;
};

function toPosix(p: string): string {
  return p.replace(/\\\\/g, "/");
}

function isAbsolutePath(input: string): boolean {
  return input.startsWith("/") || /^[A-Za-z]:[\\\\/]/.test(input);
}

function relativePath(from: string, to: string): string {
  const fromParts = toPosix(from).split("/").filter(Boolean);
  const toParts = toPosix(to).split("/").filter(Boolean);
  let shared = 0;
  while (shared < fromParts.length && shared < toParts.length && fromParts[shared] === toParts[shared]) {
    shared += 1;
  }
  const up = new Array(Math.max(0, fromParts.length - shared)).fill("..");
  const down = toParts.slice(shared);
  return [...up, ...down].join("/");
}

function uniqSorted(items: string[]): string[] {
  return [...new Set(items)].sort((a, b) => a.localeCompare(b));
}

function isTestFile(file: string): boolean {
  return /(^|\/)(test|tests)\//.test(file) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(file);
}

function isDocFile(file: string): boolean {
  return file.endsWith(".md") || file === "README" || file.endsWith("/README") || file.endsWith("/README.md") || file.startsWith("docs/");
}

function isCodeFile(file: string): boolean {
  return !isTestFile(file) && !isDocFile(file);
}

function normalizeExistingPathSet(pathOps: PathOps, paths: string[] | undefined): Set<string> {
  return new Set((paths ?? []).map((p) => pathOps.resolve(p)));
}

function targetResult(input: ResolveLifecycleTargetInput, workspaceRoot: string, absPath: string): ResolveLifecycleTargetResult {
  return {
    found: true,
    candidates: [absPath],
    target: {
      input: input.target,
      absPath,
      relPath: relativePath(workspaceRoot, absPath),
      type: input.type,
    },
  };
}

export function resolveLifecycleTarget(
  input: ResolveLifecycleTargetInput,
  pathOps: PathOps,
  defaultWorkspaceRoot: string,
): ResolveLifecycleTargetResult {
  const workspaceRoot = pathOps.resolve(input.workspaceRoot ?? defaultWorkspaceRoot);
  const cwd = pathOps.resolve(input.currentWorkingDirectory ?? workspaceRoot);
  const byPlugin = (input.workspacePlugins ?? []).find(
    (plugin) => plugin.id === input.target || plugin.dirName === input.target || plugin.name === input.target,
  );
  if (byPlugin) return targetResult(input, workspaceRoot, pathOps.resolve(byPlugin.absPath));

  const candidates = uniqSorted([
    isAbsolutePath(input.target) ? pathOps.resolve(input.target) : pathOps.resolve(workspaceRoot, input.target),
    pathOps.resolve(cwd, input.target),
  ]);
  const existing = normalizeExistingPathSet(pathOps, input.existingPaths);
  const found = candidates.find((candidate) => existing.has(candidate));
  if (found) return targetResult(input, workspaceRoot, found);

  if (input.target.includes("/") || input.target.startsWith(".")) {
    return targetResult(input, workspaceRoot, candidates[0] ?? pathOps.resolve(workspaceRoot, input.target));
  }

  return {
    found: false,
    candidates,
    reason: "target did not match a workspace plugin or observed path",
  };
}

export function evaluateLifecycleCompleteness(
  input: EvaluateLifecycleCompletenessInput,
  pathOps: PathOps,
  defaultWorkspaceRoot: string,
): LifecycleCheckData {
  const workspaceRoot = pathOps.resolve(input.workspaceRoot ?? defaultWorkspaceRoot);
  const targetAbs = pathOps.resolve(input.targetAbs);
  const targetRel = relativePath(workspaceRoot, targetAbs);
  const changed = uniqSorted(input.changedFiles.map(toPosix));

  const relevantChanged =
    input.type === "composed"
      ? changed
      : changed.filter((file) => file === targetRel || file.startsWith(`${targetRel}/`));

  const codeChanged = relevantChanged.filter(isCodeFile);
  const testChanged = changed.filter(
    (file) => isTestFile(file) && (input.type === "composed" || file === targetRel || file.startsWith(`${targetRel}/`)),
  );
  const docsChanged = changed.filter(
    (file) => isDocFile(file) && (input.type === "composed" || file === targetRel || file.startsWith(`${targetRel}/`) || file.startsWith("docs/")),
  );

  const testsRequired = ["cli", "web", "agent", "composed"].includes(input.type) && codeChanged.length > 0;
  const docsRequired = codeChanged.length > 0 || ["skill", "workflow", "composed"].includes(input.type);

  const missingTests = testsRequired && testChanged.length === 0 ? ["no test updates detected for code changes"] : [];
  const missingDocs = docsRequired && docsChanged.length === 0 ? ["no documentation updates detected for changed unit"] : [];
  const dependentFiles = uniqSorted((input.dependentFiles ?? []).map(toPosix)).filter((file) => input.repoFiles.includes(file));
  const dependentTouched = dependentFiles.length === 0 || dependentFiles.some((file) => changed.includes(file));
  const missingDependents = dependentTouched ? [] : dependentFiles.slice(0, 20);

  const status: LifecycleCheckStatus =
    missingTests.length === 0 &&
    missingDocs.length === 0 &&
    missingDependents.length === 0 &&
    input.syncVerified &&
    input.driftVerified
      ? "pass"
      : "fail";

  return {
    status,
    target: {
      input: input.targetInput,
      absPath: targetAbs,
      relPath: targetRel,
      type: input.type,
    },
    missingTests,
    missingDocs,
    missingDependents,
    syncVerified: input.syncVerified,
    driftVerified: input.driftVerified,
    driftDetected: input.driftDetected,
    details: {
      changedFilesConsidered: changed,
      relevantChangedFiles: relevantChanged,
      dependentFiles,
      codeChanged,
      testChanged,
      docsChanged,
    },
  };
}

export function checkScratchPolicy(input: ScratchPolicyCheckInput): ScratchPolicyCheck {
  if (input.bypassed) {
    return {
      mode: "off",
      bypassed: true,
      required: { planScratch: true, workingPad: true },
      missing: [],
      matches: { planScratchPaths: [], workingPadPaths: [] },
    };
  }

  const planScratchPaths = [...input.planScratchPaths].sort((a, b) => a.localeCompare(b));
  const workingPadPaths = [...input.workingPadPaths].sort((a, b) => a.localeCompare(b));
  const missing: string[] = [];
  if (planScratchPaths.length === 0) missing.push("PLAN_SCRATCH.md");
  if (workingPadPaths.length === 0) missing.push("WORKING_PAD.md");

  return {
    mode: input.mode ?? "warn",
    bypassed: false,
    required: {
      planScratch: planScratchPaths.length > 0,
      workingPad: workingPadPaths.length > 0,
    },
    missing,
    matches: {
      planScratchPaths,
      workingPadPaths,
    },
  };
}

function normalizeOutcome(raw: unknown): JudgeOutcome {
  if (raw === "auto_merge") return "auto_merge";
  if (raw === "fix_first") return "fix_first";
  if (raw === "policy_escalation") return "policy_escalation";
  return "insufficient_confidence";
}

function confidenceOrDefault(raw: unknown): number {
  if (typeof raw !== "number") return 0;
  if (!Number.isFinite(raw)) return 0;
  if (raw < 0) return 0;
  if (raw > 1) return 1;
  return raw;
}

function normalizeJudgeResult(judge: "A" | "B", input: RawJudgeResultInput | undefined): JudgeResult {
  return {
    judge,
    outcome: normalizeOutcome(input?.outcome),
    confidence: confidenceOrDefault(input?.confidence),
    reason: typeof input?.reason === "string" && input.reason.trim().length > 0
      ? input.reason
      : `judge ${judge} returned no reason`,
    ...(input && "raw" in input ? { raw: input.raw } : {}),
  };
}

function normalizePrContext(input: PrContextInput | undefined): PrContext {
  return {
    branch: typeof input?.branch === "string" && input.branch.trim().length > 0 ? input.branch.trim() : "",
    prNumber: typeof input?.prNumber === "number" ? input.prNumber : null,
    prUrl: typeof input?.prUrl === "string" && input.prUrl.trim().length > 0 ? input.prUrl.trim() : null,
    commentsCount: typeof input?.commentsCount === "number" && Number.isFinite(input.commentsCount)
      ? Math.max(0, Math.floor(input.commentsCount))
      : 0,
    commentsSummary: [...(input?.commentsSummary ?? [])].filter((comment) => comment.trim().length > 0).slice(0, 20),
  };
}

function decideMergeAction(args: {
  lifecycle: LifecycleCheckData;
  commentsCount: number;
  judge1: JudgeResult;
  judge2: JudgeResult;
}): MergeDecision {
  if (args.lifecycle.status !== "pass") return "fix_first";
  if (args.commentsCount > 0) return "hold";

  const outcomes = [args.judge1.outcome, args.judge2.outcome];
  if (outcomes.includes("policy_escalation")) return "policy_escalation";
  if (outcomes.includes("fix_first")) return "fix_first";
  if (args.judge1.outcome === "auto_merge" && args.judge2.outcome === "auto_merge") return "auto_merge";
  return "hold";
}

function toBranchToken(input: string): string {
  const token = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return token.length > 0 ? token : "change";
}

function utcTimestamp(now: Date): string {
  const y = String(now.getUTCFullYear()).padStart(4, "0");
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mm = String(now.getUTCMinutes()).padStart(2, "0");
  const ss = String(now.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}${hh}${mm}${ss}`;
}

function buildFixSliceBranchName(args: { baseBranch: string; changeUnitId: string; nowIso?: string }): string {
  const baseBranch = args.baseBranch.trim().length > 0 ? args.baseBranch.trim() : "branch";
  const changeToken = toBranchToken(args.changeUnitId).slice(0, 48);
  const date = args.nowIso ? new Date(args.nowIso) : new Date();
  const now = Number.isNaN(date.valueOf()) ? new Date() : date;
  return `${baseBranch}-fix-${changeToken}-${utcTimestamp(now)}`;
}

export function decideMergePolicy(input: DecideMergePolicyInput): DecideMergePolicyResult {
  const prContext = normalizePrContext(input.prContext);
  const judge1 = normalizeJudgeResult("A", input.judgeA);
  const judge2 = normalizeJudgeResult("B", input.judgeB);
  const consensus = decideMergeAction({
    lifecycle: input.lifecycle,
    commentsCount: prContext.commentsCount,
    judge1,
    judge2,
  });
  const policyAssessment: PolicyAssessment = {
    judge1,
    judge2,
    consensus,
    confidence: (judge1.confidence + judge2.confidence) / 2,
  };

  const shouldPlanFix = consensus === "fix_first" && input.baseBranch && input.changeUnitId;
  return {
    prContext,
    policyAssessment,
    decision: consensus,
    ...(shouldPlanFix
      ? {
          fixSlicePlan: {
            branchName: buildFixSliceBranchName({
              baseBranch: input.baseBranch ?? "",
              changeUnitId: input.changeUnitId ?? "",
              nowIso: input.nowIso,
            }),
          },
        }
      : {}),
  };
}
