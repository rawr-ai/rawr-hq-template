import { runCommand, tryParseJson } from "./process";
import type {
  JudgeOutcome,
  JudgeResult,
  LifecycleCheckData,
  MergeDecision,
  PolicyAssessment,
  PrContext,
} from "./types";

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
      raw: { stderr: exec.stderr, stdout: exec.stdout },
    };
  }

  const parsed = tryParseJson<any>(exec.stdout);
  return {
    judge,
    outcome: normalizeOutcome(parsed?.outcome),
    confidence: confidenceOrDefault(parsed?.confidence),
    reason: typeof parsed?.reason === "string" ? parsed.reason : `judge ${judge} returned no reason`,
    raw: parsed ?? exec.stdout,
  };
}

export function decideMergeAction(args: {
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

export function makePolicyAssessment(
  lifecycle: LifecycleCheckData,
  prContext: PrContext,
  judge1: JudgeResult,
  judge2: JudgeResult,
): PolicyAssessment {
  const consensus = decideMergeAction({
    lifecycle,
    commentsCount: prContext.commentsCount,
    judge1,
    judge2,
  });

  return {
    judge1,
    judge2,
    consensus,
    confidence: (judge1.confidence + judge2.confidence) / 2,
  };
}

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

  const parsed = tryParseJson<any>(prView.stdout);
  const comments = Array.isArray(parsed?.comments) ? parsed.comments : [];

  return {
    branch,
    prNumber: typeof parsed?.number === "number" ? parsed.number : null,
    prUrl: typeof parsed?.url === "string" ? parsed.url : null,
    commentsCount: comments.length,
    commentsSummary: comments
      .slice(0, 20)
      .map((c: any) => {
        const author = typeof c?.author?.login === "string" ? c.author.login : "unknown";
        const body = typeof c?.body === "string" ? c.body.replace(/\s+/g, " ").trim() : "";
        return `${author}: ${body.slice(0, 160)}`;
      }),
  };
}
