import { module } from "../module";

/**
 * Applies HQ lifecycle scratch policy to concrete scratch files found by the CLI.
 */
export const checkScratchPolicy = module.checkScratchPolicy.handler(async ({ input }) => {
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

