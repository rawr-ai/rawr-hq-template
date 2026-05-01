// TODO/P2 residual: prove production server and async harness mounting.
//
// The contained lab can start Oracle harnesses from adapter payloads and delegate
// through ProcessExecutionRuntime; the server harness can also be reached
// through a contained oRPC Fetch request boundary, and the async harness can
// be reached through a contained Inngest Bun serve/function/step boundary.
// Remaining work is native Elysia/oRPC/Inngest host mounting, StartedHarness
// production lifecycle, deployment wiring, boundary policy, native host error
// mapping, and durable async behavior.

export interface ExpectedProductionHarnessMounting {
  readonly provenLabHarnesses: readonly ["server", "async"];
  readonly harnessInput: "adapter-lowering-payload";
  readonly processRuntime: "required";
  readonly provenContainedServerBoundary: "orpc-fetch";
  readonly provenContainedAsyncBoundary: "inngest-bun-function-step";
  readonly rawAuthoringDeclarations: "forbidden";
  readonly rawCompilerPlans: "forbidden";
  readonly remainingNativeHosts: readonly ["server", "async", "cli", "web", "agent", "desktop"];
  readonly remainingBoundaryPolicy: "required";
  readonly remainingDurableAsync: "required";
  readonly remainingDeploymentWiring: "required";
}
