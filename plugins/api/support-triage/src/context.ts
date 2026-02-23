import type { SupportTriageServiceDeps } from "@rawr/support-triage";

export type SupportTriageApiContext = {
  repoRoot: string;
  requestId?: string;
  correlationId?: string;
};

export type SupportTriageApiDepsResolver<Context extends SupportTriageApiContext = SupportTriageApiContext> = (
  context: Context,
) => SupportTriageServiceDeps;

export type SupportTriageApiOperationDeps<Context extends SupportTriageApiContext = SupportTriageApiContext> = {
  resolveDeps: SupportTriageApiDepsResolver<Context>;
};
