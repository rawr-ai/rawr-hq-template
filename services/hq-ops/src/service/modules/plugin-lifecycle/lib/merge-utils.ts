export type JudgeOutcome = "auto_merge" | "fix_first" | "policy_escalation" | "insufficient_confidence";

export function normalizeOutcome(raw: unknown): JudgeOutcome {
  if (raw === "auto_merge") return "auto_merge";
  if (raw === "fix_first") return "fix_first";
  if (raw === "policy_escalation") return "policy_escalation";
  return "insufficient_confidence";
}

export function confidenceOrDefault(raw: unknown): number {
  if (typeof raw !== "number") return 0;
  if (!Number.isFinite(raw)) return 0;
  if (raw < 0) return 0;
  if (raw > 1) return 1;
  return raw;
}

export function toBranchToken(input: string): string {
  const token = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return token.length > 0 ? token : "change";
}

export function utcTimestamp(now: Date): string {
  const y = String(now.getUTCFullYear()).padStart(4, "0");
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mm = String(now.getUTCMinutes()).padStart(2, "0");
  const ss = String(now.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}${hh}${mm}${ss}`;
}
