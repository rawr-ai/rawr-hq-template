/**
 * hq-ops: plugin-lifecycle module.
 *
 * This router owns plugin lifecycle checks (and their judgement semantics) for
 * workspace plugins. The module exists so lifecycle policy is service-owned and
 * consistent across projections, while host adapters are still injected via
 * ports (`HqOpsResources`).
 */
import type { HqOpsResources } from "../../shared/ports/resources";
import { discoverWorkspacePluginCatalog } from "../plugin-catalog/helpers/discovery";
import type { WorkspacePluginCatalogEntry, WorkspacePluginKind } from "../plugin-catalog/entities";
import type { LifecycleCheckData, LifecycleTarget, LifecycleType } from "./entities";
import { module } from "./module";
import {
  confidenceOrDefault,
  normalizeOutcome,
  toBranchToken,
  utcTimestamp,
  type JudgeOutcome,
} from "./helpers/merge-utils";
import {
  isAbsolutePath,
  isCodeFile,
  isDocFile,
  isTestFile,
  relativePath,
  toPosix,
  uniqSorted,
} from "./helpers/path-utils";

type PathOps = Pick<HqOpsResources["path"], "join" | "resolve">;
type FsOps = Pick<HqOpsResources["fs"], "readDir" | "stat">;

type JudgeResult = {
  judge: "A" | "B";
  outcome: JudgeOutcome;
  confidence: number;
  reason: string;
};

type MergeDecision = "auto_merge" | "fix_first" | "policy_escalation" | "hold";

/**
 * Builds the canonical resolved-target payload after a target path is known.
 */
function targetResult(input: { target: string; type: LifecycleType }, workspaceRoot: string, absPath: string): {
  found: true;
  target: LifecycleTarget;
  candidates: string[];
} {
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

/**
 * Canonicalizes projection-observed paths before target matching.
 */
function normalizeExistingPathSet(pathOps: PathOps, paths: string[] | undefined): Set<string> {
  return new Set((paths ?? []).map((p) => pathOps.resolve(p)));
}

/**
 * Resolves lifecycle targets through the HQ catalog before falling back to
 * observed filesystem candidates supplied by the CLI.
 */
const resolveLifecycleTarget = module.resolveLifecycleTarget.handler(async ({ context, input }) => {
  const resources = context.deps.resources;
  const workspaceRoot = resources.path.resolve(input.workspaceRoot ?? context.scope.repoRoot);
  const cwd = resources.path.resolve(input.currentWorkingDirectory ?? workspaceRoot);
  const catalog = await discoverWorkspacePluginCatalog({ workspaceRoot }, resources, context.scope.repoRoot);
  const workspacePlugins = input.workspacePlugins ?? catalog.plugins;
  const byPlugin = workspacePlugins.find(
    (plugin) => plugin.id === input.target || plugin.dirName === input.target || plugin.name === input.target,
  );
  if (byPlugin) return targetResult(input, workspaceRoot, resources.path.resolve(byPlugin.absPath));

  const candidates = uniqSorted([
    isAbsolutePath(input.target) ? resources.path.resolve(input.target) : resources.path.resolve(resources.path.join(workspaceRoot, input.target)),
    resources.path.resolve(resources.path.join(cwd, input.target)),
  ]);
  const existing = normalizeExistingPathSet(resources.path, input.existingPaths);
  const found = candidates.find((candidate) => existing.has(candidate));
  if (found) return targetResult(input, workspaceRoot, found);

  if (input.target.includes("/") || input.target.startsWith(".")) {
    return targetResult(input, workspaceRoot, candidates[0] ?? resources.path.resolve(resources.path.join(workspaceRoot, input.target)));
  }

  return {
    found: false,
    candidates,
    reason: "target did not match a workspace plugin or observed path",
  };
});

/**
 * Evaluates lifecycle completeness from projection-collected git/sync evidence.
 */
const evaluateLifecycleCompleteness = module.evaluateLifecycleCompleteness.handler(async ({ context, input }) => {
  const workspaceRoot = context.deps.resources.path.resolve(input.workspaceRoot ?? context.scope.repoRoot);
  const targetAbs = context.deps.resources.path.resolve(input.targetAbs);
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
  const status: LifecycleCheckData["status"] =
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
});

/**
 * Applies HQ lifecycle scratch policy to concrete scratch files found by the CLI.
 */
const checkScratchPolicy = module.checkScratchPolicy.handler(async ({ input }) => {
  if (input.bypassed) {
    return {
      mode: "off" as const,
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
});

/**
 * Maps catalog plugin kind to the lifecycle category used by sweep/check flows.
 */
function inferTypeFromPluginKind(kind: WorkspacePluginKind): LifecycleType {
  if (kind === "toolkit") return "cli";
  if (kind === "web") return "web";
  if (kind === "agent") return "agent";
  if (kind === "workflows" || kind === "schedules") return "workflow";
  return "composed";
}

/**
 * Infers lifecycle category from explicit paths that are not catalog plugins.
 */
function inferTypeFromPath(absPath: string): LifecycleType {
  const normalized = toPosix(absPath);
  if (normalized.includes("/plugins/cli/")) return "cli";
  if (normalized.includes("/plugins/web/")) return "web";
  if (normalized.includes("/plugins/agents/")) return "agent";
  if (normalized.includes("/plugins/async/workflows/")) return "workflow";
  if (normalized.includes("/plugins/async/schedules/")) return "workflow";
  return "composed";
}

/**
 * Small filesystem existence helper used by sweep planning.
 */
async function pathExists(fsOps: FsOps, p: string): Promise<boolean> {
  return Boolean(await fsOps.stat(p));
}

/**
 * Computes service-owned quality issues for sweep candidates.
 */
async function collectSweepCandidateIssues(absPath: string, fsOps: FsOps, pathOps: PathOps): Promise<string[]> {
  const issues: string[] = [];
  if (!(await pathExists(fsOps, pathOps.join(absPath, "README.md")))) issues.push("missing README.md");

  const testDir = pathOps.join(absPath, "test");
  if (!(await pathExists(fsOps, testDir))) {
    issues.push("missing test/ directory");
    return issues;
  }

  const entries = await fsOps.readDir(testDir);
  if (!entries) {
    issues.push("missing test/ directory");
    return issues;
  }

  let hasTests = false;
  for (const entry of entries) {
    if (entry.isDirectory || !/\.(test|spec)\.[cm]?[jt]sx?$/.test(entry.name)) continue;
    if ((await fsOps.stat(pathOps.join(testDir, entry.name)))?.isFile) {
      hasTests = true;
      break;
    }
  }

  if (!hasTests) issues.push("missing test files in test/");
  return issues;
}

/**
 * Resolves explicit sweep targets against catalog identity before path fallback.
 */
function resolveExplicitSweepTarget(
  target: string,
  workspaceRoot: string,
  catalogPlugins: WorkspacePluginCatalogEntry[],
  pathOps: PathOps,
): { absPath: string; type: LifecycleType } {
  const plugin = catalogPlugins.find((candidate) =>
    candidate.id === target ||
    candidate.name === target ||
    candidate.dirName === target ||
    candidate.absPath === target ||
    candidate.relPath === target
  );
  if (plugin) return { absPath: plugin.absPath, type: inferTypeFromPluginKind(plugin.kind) };

  const absPath = isAbsolutePath(target) ? pathOps.resolve(target) : pathOps.resolve(pathOps.join(workspaceRoot, target));
  return { absPath, type: inferTypeFromPath(absPath) };
}

/**
 * Plans lifecycle sweep work from catalog inventory or explicit user targets.
 */
const planSweepCandidates = module.planSweepCandidates.handler(async ({ context, input }) => {
  const resources = context.deps.resources;
  const workspaceRoot = resources.path.resolve(input.workspaceRoot ?? context.scope.repoRoot);
  const catalog = await discoverWorkspacePluginCatalog({ workspaceRoot }, resources, context.scope.repoRoot);
  const explicitTargets = input.explicitTargets ?? [];
  const candidates: Array<{ target: string; type: LifecycleType; issues: string[] }> = [];

  if (explicitTargets.length > 0) {
    for (const target of explicitTargets) {
      const resolved = resolveExplicitSweepTarget(target, workspaceRoot, catalog.plugins, resources.path);
      if (!(await pathExists(resources.fs, resolved.absPath))) continue;
      const issues = await collectSweepCandidateIssues(resolved.absPath, resources.fs, resources.path);
      if (issues.length === 0) continue;
      candidates.push({ target: resolved.absPath, type: resolved.type, issues });
    }
  } else {
    for (const plugin of catalog.plugins) {
      const issues = await collectSweepCandidateIssues(plugin.absPath, resources.fs, resources.path);
      if (issues.length === 0) continue;
      candidates.push({ target: plugin.absPath, type: inferTypeFromPluginKind(plugin.kind), issues });
    }
  }

  const sorted = candidates.sort((a, b) => a.target.localeCompare(b.target));
  const limit = Math.max(1, Math.trunc(input.limit ?? 20));
  return {
    workspaceRoot,
    candidates: sorted,
    queued: sorted.slice(0, limit),
  };
});

/**
 * Normalizes reviewer judgment inputs into the service's merge-policy model.
 */
function normalizeJudgeResult(
  judge: "A" | "B",
  input: { outcome?: string; confidence?: number; reason?: string } | undefined,
): JudgeResult {
  return {
    judge,
    outcome: normalizeOutcome(input?.outcome),
    confidence: confidenceOrDefault(input?.confidence),
    reason: typeof input?.reason === "string" && input.reason.trim().length > 0
      ? input.reason
      : `judge ${judge} returned no reason`,
  };
}

/**
 * Normalizes optional PR context so merge policy can reason over missing data
 * without leaking nullish branching into the procedure body.
 */
function normalizePrContext(input: {
  branch?: string;
  prNumber?: number | null;
  prUrl?: string | null;
  commentsCount?: number;
  commentsSummary?: string[];
} | undefined) {
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

/**
 * Encodes HQ's conservative merge decision order for plugin lifecycle work.
 */
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

/**
 * Generates a deterministic branch name for a follow-up fix slice.
 */
function buildFixSliceBranchName(args: { baseBranch: string; changeUnitId: string; nowIso?: string }): string {
  const baseBranch = args.baseBranch.trim().length > 0 ? args.baseBranch.trim() : "branch";
  const changeToken = toBranchToken(args.changeUnitId).slice(0, 48);
  const date = args.nowIso ? new Date(args.nowIso) : new Date();
  const now = Number.isNaN(date.valueOf()) ? new Date() : date;
  return `${baseBranch}-fix-${changeToken}-${utcTimestamp(now)}`;
}

/**
 * Applies lifecycle evidence and reviewer signals to produce merge policy.
 */
const decideMergePolicy = module.decideMergePolicy.handler(async ({ input }) => {
  const prContext = normalizePrContext(input.prContext);
  const judge1 = normalizeJudgeResult("A", input.judgeA);
  const judge2 = normalizeJudgeResult("B", input.judgeB);
  const consensus = decideMergeAction({
    lifecycle: input.lifecycle,
    commentsCount: prContext.commentsCount,
    judge1,
    judge2,
  });
  const policyAssessment = {
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
});

/**
 * Router export for plugin lifecycle checks, sweep planning, and merge policy.
 */
export const router = module.router({
  resolveLifecycleTarget,
  evaluateLifecycleCompleteness,
  checkScratchPolicy,
  planSweepCandidates,
  decideMergePolicy,
});
