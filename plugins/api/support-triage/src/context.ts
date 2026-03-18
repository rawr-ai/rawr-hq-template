import type { SupportTriageClient } from "../../../../packages/support-triage";

export type SupportTriageApiContext = {
  repoRoot: string;
  requestId?: string;
  correlationId?: string;
};

export type SupportTriageApiClientResolver<Context extends SupportTriageApiContext = SupportTriageApiContext> = (
  context: Context,
) => SupportTriageClient;

export type SupportTriageApiOperationDeps<Context extends SupportTriageApiContext = SupportTriageApiContext> = {
  resolveClient: SupportTriageApiClientResolver<Context>;
};
