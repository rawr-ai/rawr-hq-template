import type { Inngest } from "inngest";

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

export type BoundaryMiddlewareSupportState<TMarker extends string = string> = {
  markerCache: Map<TMarker, unknown>;
};

export type HostRuntimeSupportContext<TRuntime = unknown> = {
  repoRoot: string;
  baseUrl: string;
  runtime: TRuntime;
  inngestClient: Inngest;
};

export type BoundaryRequestSupportContext<
  TRuntime = unknown,
  TMarker extends string = string,
> = HostRuntimeSupportContext<TRuntime> & {
  requestId: string;
  correlationId: string;
  middlewareState: BoundaryMiddlewareSupportState<TMarker>;
};
