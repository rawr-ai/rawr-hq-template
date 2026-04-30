import {
  Effect as VendorEffect,
  Exit,
  Layer,
  ManagedRuntime,
} from "effect";
import type { RawrEffect } from "../sdk/effect";

/**
 * Narrow effect-runtime adapter for the lab surfaces. It lets process/provider
 * runtimes propagate AbortSignal through Effect without exposing or retaining
 * the concrete ManagedRuntime handle outside this module.
 */
export interface EffectRuntimeAccess {
  readonly kind: "effect.runtime-access";
  runPromiseExit<TOutput, TError>(
    effect: RawrEffect<TOutput, TError, never>,
    options?: { readonly signal?: AbortSignal },
  ): Promise<Exit.Exit<TOutput, TError>>;
  dispose(): Promise<void>;
}

export function createManagedEffectRuntimeAccess(): EffectRuntimeAccess {
  const runtime = ManagedRuntime.make(Layer.empty);

  return {
    kind: "effect.runtime-access",
    runPromiseExit(effect, options) {
      return runtime.runPromiseExit(effect, options);
    },
    dispose() {
      return runtime.dispose();
    },
  };
}

export function runRawrEffectExit<TOutput, TError>(
  effect: RawrEffect<TOutput, TError, never>,
  options?: { readonly signal?: AbortSignal },
): Promise<Exit.Exit<TOutput, TError>> {
  return VendorEffect.runPromiseExit(effect, options);
}

export { Exit };
