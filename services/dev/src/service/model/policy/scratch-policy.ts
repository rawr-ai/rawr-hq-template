import type { ScratchPolicyCheck, ScratchPolicyInput } from "../dto/scratch-policy.dto";

const DEFAULT_ROOTS = ["docs/projects"];
const DEFAULT_PLAN_FILES = ["PLAN_SCRATCH.md", "PERSONAL_PLAN_SCRATCH.md"];
const DEFAULT_PAD_FILES = ["WORKING_PAD.md", "PERSONAL_WORKING_PAD.md"];

/** Pure filesystem-selection policy consumed by the service middleware. */
export type ScratchObservationPlan = {
  roots: readonly string[];
  planFileNames: ReadonlySet<string>;
  workingPadFileNames: ReadonlySet<string>;
  depth: number;
};

/** Selects the bounded workspace observations required by one scratch-policy request. */
export function scratchObservationPlan(request: ScratchPolicyInput): ScratchObservationPlan | null {
  const mode = request.mode ?? "warn";
  if (request.bypassed || mode === "off") return null;
  return {
    roots: request.roots ?? DEFAULT_ROOTS,
    planFileNames: new Set(request.planFileNames ?? DEFAULT_PLAN_FILES),
    workingPadFileNames: new Set(request.workingPadFileNames ?? DEFAULT_PAD_FILES),
    depth: 5,
  };
}

/**
 * Evaluates observed scratch records against the requested admission posture.
 *
 * The evaluator owns only policy. Filesystem discovery remains in the async
 * coordinator, and caller-owned observation arrays are never mutated.
 */
export function evaluateScratchPolicy(
  request: ScratchPolicyInput,
  matches: ScratchPolicyCheck["matches"]
): ScratchPolicyCheck {
  if (request.bypassed) {
    return {
      mode: "off",
      bypassed: true,
      required: { planScratch: true, workingPad: true },
      missing: [],
      matches: { planScratchPaths: [], workingPadPaths: [] },
      blocked: false,
    };
  }

  const mode = request.mode ?? "warn";
  if (mode === "off") {
    return {
      mode,
      bypassed: false,
      required: { planScratch: true, workingPad: true },
      missing: [],
      matches: { planScratchPaths: [], workingPadPaths: [] },
      blocked: false,
    };
  }

  const planScratchPaths = [...matches.planScratchPaths].sort((a, b) => a.localeCompare(b));
  const workingPadPaths = [...matches.workingPadPaths].sort((a, b) => a.localeCompare(b));
  const missing = [];
  if (planScratchPaths.length === 0) missing.push("PLAN_SCRATCH.md");
  if (workingPadPaths.length === 0) missing.push("WORKING_PAD.md");

  return {
    mode,
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
    blocked: Boolean(request.enforce) && mode === "block" && missing.length > 0,
  };
}
