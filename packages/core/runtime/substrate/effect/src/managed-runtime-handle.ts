import { type Context, type Effect, type Exit, ManagedRuntime } from "effect";

import {
  createProviderLifecycleLayer,
  type ProviderLifecycleInput,
  type ProvisionedResourceValues,
} from "./provider-lifecycle";

export interface ManagedRuntimeHandle<TResources> {
  readonly kind: "managed-runtime.handle";
  readonly processId: string;
  readonly context: Context.Context<TResources>;
  run<A, E>(
    effect: Effect.Effect<A, E, TResources>,
    options?: { readonly signal?: AbortSignal }
  ): Promise<A>;
  runExit<A, E>(
    effect: Effect.Effect<A, E, TResources>,
    options?: { readonly signal?: AbortSignal }
  ): Promise<Exit.Exit<A, E>>;
  dispose(): Promise<void>;
}

export async function createManagedRuntimeHandle(
  input: ProviderLifecycleInput
): Promise<ManagedRuntimeHandle<ProvisionedResourceValues>> {
  const runtime = ManagedRuntime.make(createProviderLifecycleLayer(input));
  try {
    const context = await runtime.context();
    // Native beta.101 cannot retry provisioning after a successful force: dispose installs a defect.
    // Retain its methods and fiber ownership; narrow only this private, proven-ready typestate.
    const ready = runtime as ManagedRuntime.ManagedRuntime<ProvisionedResourceValues, never>;
    return Object.freeze({
      kind: "managed-runtime.handle",
      processId: input.processId,
      context,
      run: <A, E>(
        effect: Effect.Effect<A, E, ProvisionedResourceValues>,
        options?: { readonly signal?: AbortSignal }
      ) => ready.runPromise(effect, options),
      runExit: <A, E>(
        effect: Effect.Effect<A, E, ProvisionedResourceValues>,
        options?: { readonly signal?: AbortSignal }
      ) => ready.runPromiseExit(effect, options),
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
