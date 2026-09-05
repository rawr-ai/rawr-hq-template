import { type Context, type Effect, type Exit, ManagedRuntime } from "effect";

import {
  createProviderLifecycleLayer,
  type ProviderLifecycleInput,
  type ProvisionedResourceValues,
} from "./provider-lifecycle";

export interface ManagedRuntimeHandle<TResources, TProvisionError> {
  readonly kind: "managed-runtime.handle";
  readonly processId: string;
  readonly context: Context.Context<TResources>;
  run<A, E>(effect: Effect.Effect<A, E, TResources>): Promise<A>;
  runExit<A, E>(
    effect: Effect.Effect<A, E, TResources>
  ): Promise<Exit.Exit<A, E | TProvisionError>>;
  dispose(): Promise<void>;
}

export async function createManagedRuntimeHandle(
  input: ProviderLifecycleInput
): Promise<ManagedRuntimeHandle<ProvisionedResourceValues, unknown>> {
  const runtime = ManagedRuntime.make(createProviderLifecycleLayer(input));
  try {
    const context = await runtime.context();
    return Object.freeze({
      kind: "managed-runtime.handle",
      processId: input.processId,
      context,
      run: <A, E>(effect: Effect.Effect<A, E, ProvisionedResourceValues>) =>
        runtime.runPromise(effect),
      runExit: <A, E>(effect: Effect.Effect<A, E, ProvisionedResourceValues>) =>
        runtime.runPromiseExit(effect),
      dispose: () => runtime.dispose(),
    });
  } catch (error) {
    try {
      await runtime.dispose();
    } catch {
      // Startup's native failure remains primary even if runtime closure also fails.
    }
    throw error;
  }
}
