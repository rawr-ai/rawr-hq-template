// TODO/P2 residual: prove production server and async harness mounting.
//
// The contained lab can start mini harnesses from adapter payloads and delegate
// through ProcessExecutionRuntime. Remaining work is native Elysia/oRPC/Inngest
// host mounting, StartedHarness production lifecycle, deployment wiring,
// boundary policy, and durable async behavior.

export interface ExpectedProductionHarnessMounting {
  readonly provenLabHarnesses: readonly ["server", "async"];
  readonly harnessInput: "adapter-lowering-payload";
  readonly processRuntime: "required";
  readonly rawAuthoringDeclarations: "forbidden";
  readonly rawCompilerPlans: "forbidden";
  readonly remainingNativeHosts: readonly ["server", "async", "cli", "web", "agent", "desktop"];
  readonly remainingBoundaryPolicy: "required";
  readonly remainingDurableAsync: "required";
  readonly remainingDeploymentWiring: "required";
}
