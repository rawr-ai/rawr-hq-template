/**
 * @fileoverview Run-lifecycle module composition for Hyperresearch Codex.
 */
import { service } from "../../impl";

export const module = service.runs.use(async ({ context, next }) =>
  next({
    context: {
      repoRoot: context.scope.repoRoot,
      io: context.deps.io,
      cli: context.deps.cli,
    },
  })
);
