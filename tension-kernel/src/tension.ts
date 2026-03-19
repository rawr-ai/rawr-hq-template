import { v4 as uuid } from "uuid";
import type {
  Tension,
  TensionType,
  Polarity,
  Steward,
  ResonanceEntry,
  TokenUsage,
} from "./types.js";
import { callLLMJSON } from "./llm.js";
import { buildAssessmentPrompt } from "./prompts.js";

export function createTension(
  stewardId: string,
  domain: string,
  type: TensionType,
  description: string,
  evidence: string[]
): Tension {
  return {
    id: uuid(),
    stewardId,
    domain,
    type,
    description,
    evidence,
    createdAt: Date.now(),
    resonance: new Map(),
    polarity: "unresolved",
    magnitude: 0,
    resolvedBy: null,
  };
}

/**
 * Find stewards adjacent to a tension based on path overlap.
 * Two stewards are adjacent if any of their ownedPaths share a common
 * directory prefix with files mentioned in the tension's evidence,
 * or if the source steward's paths overlap with theirs.
 */
export function findAdjacentStewards(
  tension: Tension,
  stewards: Map<string, Steward>,
  sourceId: string
): Steward[] {
  const sourceSteward = stewards.get(sourceId);
  if (!sourceSteward) return [];

  const adjacent: Steward[] = [];

  for (const [id, steward] of stewards) {
    if (id === sourceId) continue;

    // Check if any owned paths overlap (share a directory)
    const hasOverlap = steward.ownedPaths.some((theirPath) =>
      sourceSteward.ownedPaths.some(
        (ourPath) =>
          theirPath.startsWith(dirOf(ourPath)) ||
          ourPath.startsWith(dirOf(theirPath)) ||
          dirOf(theirPath) === dirOf(ourPath)
      )
    );

    // Also check evidence mentions
    const evidenceOverlap = tension.evidence.some((ev) =>
      steward.ownedPaths.some(
        (p) => ev.includes(p) || p.includes(ev)
      )
    );

    if (hasOverlap || evidenceOverlap) {
      adjacent.push(steward);
    }
  }

  return adjacent;
}

function dirOf(path: string): string {
  const lastSlash = path.lastIndexOf("/");
  return lastSlash > 0 ? path.slice(0, lastSlash + 1) : path;
}

interface AssessmentResponse {
  assessment: "agree" | "indifferent" | "disagree";
  reason: string;
  logOwnTension: {
    type: TensionType;
    description: string;
    evidence: string[];
  } | null;
}

/**
 * Run assessment for a tension against all adjacent stewards.
 * Returns the updated tension with resonance populated and any new tensions
 * the assessors want to log.
 */
export async function assessTension(
  tension: Tension,
  adjacentStewards: Steward[],
  files: Map<string, string>
): Promise<{
  tension: Tension;
  newTensions: Tension[];
  usage: TokenUsage;
}> {
  if (adjacentStewards.length === 0) {
    return { tension, newTensions: [], usage: { inputTokens: 0, outputTokens: 0 } };
  }

  const totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
  const newTensions: Tension[] = [];

  // Parallelize assessment calls
  const results = await Promise.all(
    adjacentStewards.map(async (assessor) => {
      try {
        const { system, userMessage } = buildAssessmentPrompt(
          tension,
          assessor,
          files
        );
        const { data, usage } = await callLLMJSON<AssessmentResponse>(
          system,
          userMessage
        );
        return { assessor, data, usage };
      } catch (err) {
        console.log(
          `  [tension] Assessment by ${assessor.name} failed: ${err instanceof Error ? err.message : String(err)}`
        );
        return null;
      }
    })
  );

  for (const result of results) {
    if (!result) continue;

    const { assessor, data, usage } = result;
    totalUsage.inputTokens += usage.inputTokens;
    totalUsage.outputTokens += usage.outputTokens;

    // Determine weight based on path overlap proximity
    const weight = assessor.ownedPaths.some((p) =>
      tension.evidence.some((ev) => ev.includes(p))
    )
      ? 1.0
      : 0.5;

    const entry: ResonanceEntry = {
      assessment: data.assessment,
      entry: null,
      reason: data.reason,
      weight,
    };

    // If assessor wants to log their own tension
    if (data.logOwnTension) {
      const newT = createTension(
        assessor.id,
        assessor.domain,
        data.logOwnTension.type,
        data.logOwnTension.description,
        data.logOwnTension.evidence
      );
      entry.entry = newT.id;
      newTensions.push(newT);
    }

    tension.resonance.set(assessor.id, entry);
  }

  // Compute magnitude and polarity
  computeMagnitudeAndPolarity(tension);

  return { tension, newTensions, usage: totalUsage };
}

/**
 * Compute magnitude and polarity from resonance entries.
 *
 * magnitude = abs(Σ (assessment_value × weight))
 * where: agree = +1, indifferent = 0, disagree = -1
 *
 * polarity:
 *   all agree → "cohesion"
 *   all indifferent → "indifferent"
 *   any disagree → "tension"
 *   no assessments → "unresolved"
 */
export function computeMagnitudeAndPolarity(tension: Tension): void {
  const entries = Array.from(tension.resonance.values());

  if (entries.length === 0) {
    tension.polarity = "unresolved";
    tension.magnitude = 0;
    return;
  }

  const valueMap: Record<string, number> = {
    agree: 1,
    indifferent: 0,
    disagree: -1,
  };

  let sum = 0;
  let hasDisagree = false;
  let allIndifferent = true;
  let allAgree = true;

  for (const entry of entries) {
    const val = valueMap[entry.assessment] ?? 0;
    sum += val * entry.weight;
    if (entry.assessment === "disagree") hasDisagree = true;
    if (entry.assessment !== "indifferent") allIndifferent = false;
    if (entry.assessment !== "agree") allAgree = false;
  }

  tension.magnitude = Math.abs(sum);

  if (hasDisagree) {
    tension.polarity = "tension";
  } else if (allIndifferent) {
    tension.polarity = "indifferent";
  } else if (allAgree) {
    tension.polarity = "cohesion";
  } else {
    tension.polarity = "unresolved";
  }
}

/**
 * Evaluate a tension against thresholds:
 * - Cohesion magnitude > 1.5 → propose boundary split
 * - Tension magnitude > 1.0 → escalate to human
 * - Otherwise → stays in ledger
 */
export function evaluateTension(
  tension: Tension
): "propose-boundary" | "escalate" | "ledger" {
  if (tension.polarity === "cohesion" && tension.magnitude > 1.5) {
    return "propose-boundary";
  }
  if (tension.polarity === "tension" && tension.magnitude > 1.0) {
    return "escalate";
  }
  return "ledger";
}
