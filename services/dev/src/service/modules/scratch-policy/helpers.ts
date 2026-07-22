import type { ScratchPolicyCheck, ScratchPolicyInput } from "../../common/entities";
import type { DevResources } from "../../common/resources";

const DEFAULT_ROOTS = ["docs/projects"];
const DEFAULT_PLAN_FILES = ["PLAN_SCRATCH.md", "PERSONAL_PLAN_SCRATCH.md"];
const DEFAULT_PAD_FILES = ["WORKING_PAD.md", "PERSONAL_WORKING_PAD.md"];

async function collectScratchFiles(input: {
  resources: DevResources;
  root: string;
  depth: number;
  planFileNames: Set<string>;
  workingPadFileNames: Set<string>;
  planScratchPaths: string[];
  workingPadPaths: string[];
}): Promise<void> {
  if (input.depth < 0) return;
  const entries = await input.resources.fs.readDir(input.root);
  if (!entries) return;
  for (const entry of entries) {
    const abs = input.resources.path.join(input.root, entry.name);
    if (entry.isDirectory) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name.startsWith("."))
        continue;
      await collectScratchFiles({ ...input, root: abs, depth: input.depth - 1 });
      continue;
    }
    if (input.planFileNames.has(entry.name)) input.planScratchPaths.push(abs);
    if (input.workingPadFileNames.has(entry.name)) input.workingPadPaths.push(abs);
  }
}

export async function checkScratchPolicy(input: {
  workspaceRoot: string;
  resources: DevResources;
  request?: ScratchPolicyInput;
}): Promise<ScratchPolicyCheck> {
  const request = input.request ?? {};
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

  const planScratchPaths: string[] = [];
  const workingPadPaths: string[] = [];
  const planFileNames = new Set(request.planFileNames ?? DEFAULT_PLAN_FILES);
  const workingPadFileNames = new Set(request.workingPadFileNames ?? DEFAULT_PAD_FILES);

  for (const root of request.roots ?? DEFAULT_ROOTS) {
    await collectScratchFiles({
      resources: input.resources,
      root: input.resources.path.join(input.workspaceRoot, root),
      depth: 5,
      planFileNames,
      workingPadFileNames,
      planScratchPaths,
      workingPadPaths,
    });
  }

  planScratchPaths.sort((a, b) => a.localeCompare(b));
  workingPadPaths.sort((a, b) => a.localeCompare(b));
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
