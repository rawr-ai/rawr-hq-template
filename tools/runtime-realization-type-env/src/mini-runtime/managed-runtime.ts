import {
  Effect as VendorEffect,
  Exit,
  Layer,
  ManagedRuntime,
} from "effect";
import type { RawrEffect } from "../sdk/effect";

export interface EffectRuntimeAccess {
  readonly kind: "effect.runtime-access";
  runPromiseExit<TOutput, TError>(
    effect: RawrEffect<TOutput, TError, never>,
  ): Promise<Exit.Exit<TOutput, TError>>;
  dispose(): Promise<void>;
}

export function createManagedEffectRuntimeAccess(): EffectRuntimeAccess {
  const runtime = ManagedRuntime.make(Layer.empty);

  return {
    kind: "effect.runtime-access",
    runPromiseExit(effect) {
      return runtime.runPromiseExit(effect);
    },
    dispose() {
      return runtime.dispose();
    },
  };
}

export function runRawrEffectExit<TOutput, TError>(
  effect: RawrEffect<TOutput, TError, never>,
): Promise<Exit.Exit<TOutput, TError>> {
  return VendorEffect.runPromiseExit(effect);
}

export { Exit };
