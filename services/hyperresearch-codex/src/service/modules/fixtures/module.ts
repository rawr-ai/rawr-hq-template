/**
 * @fileoverview Fixture module composition for synthetic Hyperresearch proofs.
 */
import { service } from "../../impl";

export const module = service.fixtures.use(async ({ context, next }) =>
  next({
    context: {
      repoRoot: context.scope.repoRoot,
      io: context.deps.io,
      cli: context.deps.cli,
    },
  })
);
