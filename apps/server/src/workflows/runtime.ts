/**
 * @agents-style seam-law declaration -> host binding -> request/process materialization
 * @agents-style canonical host workflow runtime home
 *
 * Owns:
 * - process-scoped workflow runtime adapter construction for the host shell
 * - host-local normalization of workflow runtime environment input
 *
 * Must not own:
 * - plugin declaration choice
 * - route mounting
 * - request-scoped context creation
 *
 * Canonical:
 * - `rawr.ts` calls this file for workflow runtime input instead of
 *   constructing capability-specific adapters inline
 */
function asUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    return parsed.href;
  } catch {
    return undefined;
  }
}

export function resolveRawrWorkflowInngestBaseUrl(): string {
  return (
    asUrl(process.env.INNGEST_BASE_URL) ??
    asUrl(process.env.INNGEST_EVENT_API_BASE_URL) ??
    asUrl(process.env.INNGEST_DEV) ??
    "http://localhost:8288"
  );
}

export function createRawrWorkflowRuntime(input: {
  repoRoot: string;
  inngestBaseUrl?: string;
}) {
  return {
    repoRoot: input.repoRoot,
    inngestBaseUrl: input.inngestBaseUrl ?? resolveRawrWorkflowInngestBaseUrl(),
  } as const;
}
