import { module } from "./module";

const runUndo = module.runUndo.handler(async ({ context, input }) => {
  return context.repo.runUndo({ workspaceRoot: context.repoRoot, dryRun: input.dryRun });
});

export const router = module.router({
  runUndo,
});
