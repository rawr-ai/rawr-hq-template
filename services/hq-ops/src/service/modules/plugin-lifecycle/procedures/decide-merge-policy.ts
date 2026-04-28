import type { LifecycleCheckData } from "../entities";
import { module } from "../module";
import {
  confidenceOrDefault,
  normalizeOutcome,
  toBranchToken,
  utcTimestamp,
  type JudgeOutcome,
} from "../helpers/merge-utils";

type JudgeResult = {
  judge: "A" | "B";
  outcome: JudgeOutcome;
  confidence: number;
  reason: string;
};

type MergeDecision = "auto_merge" | "fix_first" | "policy_escalation" | "hold";

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
export const decideMergePolicy = module.decideMergePolicy.handler(async ({ input }) => {
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

