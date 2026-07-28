/**
 * @agents-style seam-law declaration -> host binding -> request/process materialization
 * @agents-canonical type-only support seam package
 * @agents-must-not semantic capability authority or compatibility alias sink
 *
 * Owns:
 * - shared runtime support types used after host binding during request/process materialization
 *
 * Must not own:
 * - declarations, satisfier binding, or executable assembly
 * - long-lived alias exports once canonical names are adopted
 */
export type WorkflowRuntimeSupportSeam<
  TWorkflow,
  TDesk,
  TRun,
  TEvent,
  TValue = unknown,
> = Readonly<{
  readMemory: (workflow: TWorkflow, deskId: string) => Promise<TValue>;
  writeMemory: (workflow: TWorkflow, desk: TDesk, value: TValue) => Promise<void>;
  getRunStatus: (runId: string) => Promise<TRun | null>;
  saveRunStatus: (run: TRun) => Promise<void>;
  appendTimeline: (runId: string, event: TEvent) => Promise<void>;
  inngestBaseUrl?: string;
}>;

/** Request-local memoization state carried inside the invocation lane. */
export type BoundaryMiddlewareSupportState<TMarker extends string = string, TValue = unknown> = {
  markerCache: Map<TMarker, TValue>;
};

/**
 * Host-owned stable context lanes supplied before request middleware runs.
 *
 * Capability-specific hosts specialize these lanes without moving their
 * construction or policy into this type-only package.
 */
export type HostRuntimeSupportContext<
  TDeps extends object = Record<never, never>,
  TScope extends object = Record<never, never>,
  TConfig extends object = Record<never, never>,
> = {
  deps: TDeps;
  scope: TScope;
  config: TConfig;
};

/**
 * Request context after invocation facts and the empty `provided` lane enter.
 *
 * Native oRPC middleware may widen `provided`; the four owner/lifetime lanes
 * remain stable throughout the request.
 */
export type BoundaryRequestSupportContext<
  TDeps extends object = Record<never, never>,
  TScope extends object = Record<never, never>,
  TConfig extends object = Record<never, never>,
  TInvocation extends object = Record<never, never>,
> = HostRuntimeSupportContext<TDeps, TScope, TConfig> & {
  invocation: TInvocation;
  provided: Record<never, never>;
};
