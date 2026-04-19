import type { CreateClientOptions } from "../src/client";
import {
  createRequiredServiceAnalyticsMiddleware,
  createRequiredServiceObservabilityMiddleware,
} from "../src/service/base";
import { impl } from "../src/service/impl";
import { repository } from "../src/service/modules/state/middleware";
import { module } from "../src/service/modules/state/module";

declare const deps: CreateClientOptions["deps"];

const validBoundary: CreateClientOptions = {
  deps,
  scope: {
    repoRoot: "/tmp/rawr-state-typing",
  },
  config: {},
};
void validBoundary;

// @ts-expect-error servicepackage boundaries must include deps, scope, and config lanes.
const missingConfigBoundary: CreateClientOptions = {
  deps,
  scope: {
    repoRoot: "/tmp/rawr-state-typing",
  },
};
void missingConfigBoundary;

// @ts-expect-error servicepackage boundaries must include deps, scope, and config lanes.
const missingScopeBoundary: CreateClientOptions = {
  deps,
  config: {},
};
void missingScopeBoundary;

createRequiredServiceObservabilityMiddleware({
  spanAttributes: ({ context }) => ({
    repo_root: context.scope.repoRoot,
    invocation_trace_id: context.invocation.traceId,
    // @ts-expect-error required service middleware must not depend on provided context.
    provided_repo_root: context.provided.repo,
  }),
});

createRequiredServiceAnalyticsMiddleware({
  payload: ({ context }) => ({
    repoRoot: context.scope.repoRoot,
    traceId: context.invocation.traceId,
    // @ts-expect-error required service middleware must not depend on provided context.
    providedRepo: context.provided.repo,
  }),
});

const providedRepoBranch = impl.state.use(repository).use(async ({ context, next }) => {
  await context.provided.repo.getStateWithAuthority();
  // @ts-expect-error state module providers widen provided.repo, not provided.repository.
  await context.provided.repository.getStateWithAuthority();
  return next();
});
void providedRepoBranch;

const narrowedHandler = module.getState.handler(async ({ context }) => {
  const snapshot = await context.repo.getStateWithAuthority();
  // @ts-expect-error handler context is narrowed to context.repo.
  await context.repository.getStateWithAuthority();
  return snapshot;
});
void narrowedHandler;
