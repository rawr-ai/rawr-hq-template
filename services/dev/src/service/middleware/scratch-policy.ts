import { base } from "../base";
import type { ScratchPolicyCheck, ScratchPolicyInput } from "../model/dto/scratch-policy.dto";
import {
  evaluateScratchPolicy,
  type ScratchObservationPlan,
  scratchObservationPlan,
} from "../model/policy/scratch-policy";
import type { DevFileSystemResource, DevPathResource, ScratchPolicyChecker } from "../model/ports";

async function collectScratchFiles(input: {
  fs: DevFileSystemResource;
  path: DevPathResource;
  root: string;
  depth: number;
  plan: ScratchObservationPlan;
  matches: ScratchPolicyCheck["matches"];
}): Promise<void> {
  if (input.depth < 0) return;
  const entries = await input.fs.readDir(input.root);
  if (!entries) return;

  for (const entry of entries) {
    const absolutePath = input.path.join(input.root, entry.name);
    if (entry.isDirectory) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name.startsWith(".")) {
        continue;
      }
      await collectScratchFiles({
        ...input,
        root: absolutePath,
        depth: input.depth - 1,
      });
      continue;
    }
    if (input.plan.planFileNames.has(entry.name)) {
      input.matches.planScratchPaths.push(absolutePath);
    }
    if (input.plan.workingPadFileNames.has(entry.name)) {
      input.matches.workingPadPaths.push(absolutePath);
    }
  }
}

async function checkScratchPolicy(input: {
  workspaceRoot: string;
  fs: DevFileSystemResource;
  path: DevPathResource;
  request?: ScratchPolicyInput;
}): Promise<ScratchPolicyCheck> {
  const request = input.request ?? {};
  const plan = scratchObservationPlan(request);
  const matches: ScratchPolicyCheck["matches"] = {
    planScratchPaths: [],
    workingPadPaths: [],
  };
  if (!plan) return evaluateScratchPolicy(request, matches);

  for (const root of plan.roots) {
    await collectScratchFiles({
      fs: input.fs,
      path: input.path,
      root: input.path.join(input.workspaceRoot, root),
      depth: plan.depth,
      plan,
      matches,
    });
  }
  return evaluateScratchPolicy(request, matches);
}

/** Derives one service-wide scratch admission capability from the base context. */
export const middleware = base.middleware(async ({ context, next }) => {
  const check: ScratchPolicyChecker = (request) =>
    checkScratchPolicy({
      workspaceRoot: context.scope.workspaceRoot,
      fs: context.deps.resources.fs,
      path: context.deps.resources.path,
      request,
    });

  return next({ context: { provided: { checkScratchPolicy: check } } });
});
