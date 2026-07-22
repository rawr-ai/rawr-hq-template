import { type Effect, Exit, type Layer, ManagedRuntime } from "effect";

export interface ResearchRuntimeUnavailable {
  readonly kind: "ResearchRuntimeUnavailable";
  readonly state: "Disposing" | "Disposed";
}

export interface ResearchProcessRuntime<Services, BuildError> {
  readonly runPromiseExit: <Output, Error>(
    effect: Effect.Effect<Output, Error, Services>,
    options?: Effect.RunOptions
  ) => Promise<Exit.Exit<Output, Error | BuildError | ResearchRuntimeUnavailable>>;
  readonly dispose: () => Promise<void>;
}

export function makeResearchProcessRuntime<Services, BuildError>(
  layer: Layer.Layer<Services, BuildError, never>
): ResearchProcessRuntime<Services, BuildError> {
  const runtime = ManagedRuntime.make(layer);
  const activeRuns = new Set<Promise<unknown>>();
  let state: "Active" | "Disposing" | "Disposed" = "Active";
  let disposal: Promise<void> | undefined;

  return {
    runPromiseExit(effect, options) {
      if (state !== "Active") {
        return Promise.resolve(Exit.fail({ kind: "ResearchRuntimeUnavailable", state }));
      }

      const execution = runtime.runPromiseExit(effect, options);
      activeRuns.add(execution);
      void execution.then(
        () => activeRuns.delete(execution),
        () => activeRuns.delete(execution)
      );
      return execution;
    },
    dispose() {
      if (disposal === undefined) {
        state = "Disposing";
        disposal = (async () => {
          const runtimeDisposal = runtime.dispose();
          try {
            await Promise.allSettled([...activeRuns]);
            await runtimeDisposal;
          } finally {
            state = "Disposed";
          }
        })();
      }
      return disposal;
    },
  };
}
