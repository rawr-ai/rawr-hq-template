import type { Inngest } from "inngest";

// Thin runtime support seams used by host/plugin wiring. These are not
// semantic capability authority.
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

/** @deprecated Prefer `WorkflowRuntimeSupportSeam`. */
export type WorkflowRuntimeAdapter<
  TWorkflow,
  TDesk,
  TRun,
  TEvent,
  TValue = unknown,
> = WorkflowRuntimeSupportSeam<TWorkflow, TDesk, TRun, TEvent, TValue>;

/** @deprecated Prefer `BoundaryMiddlewareSupportState`. */
export type BoundaryMiddlewareState<TMarker extends string = string> =
  BoundaryMiddlewareSupportState<TMarker>;

/** @deprecated Prefer `HostRuntimeSupportContext`. */
export type RuntimeRouterContext<TRuntime = unknown> = HostRuntimeSupportContext<TRuntime>;

/** @deprecated Prefer `BoundaryRequestSupportContext`. */
export type RequestBoundaryContext<
  TRuntime = unknown,
  TMarker extends string = string,
> = BoundaryRequestSupportContext<TRuntime, TMarker>;
