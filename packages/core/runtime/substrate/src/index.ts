import {
  Effect as VendorEffect,
  Exit,
  Layer,
  ManagedRuntime,
} from "effect";
import {
  Effect,
  type EffectBody,
  type RawrEffect,
} from "@rawr/sdk/effect";

export const RAWR_RUNTIME_SUBSTRATE_TOPOLOGY = "packages/core/runtime/substrate" as const;

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
    runPromiseExit<TOutput, TError>(
      effect: RawrEffect<TOutput, TError, never>,
      options?: { readonly signal?: AbortSignal },
    ) {
      return runtime.runPromiseExit(
        effect as unknown as VendorEffect.Effect<TOutput, TError, never>,
        options,
      );
    },
    dispose() {
      return runtime.dispose();
    },
  };
}

function isGeneratorResult(value: unknown): value is Generator<unknown, unknown, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { next?: unknown }).next === "function" &&
    typeof (value as { [Symbol.iterator]?: unknown })[Symbol.iterator] === "function"
  );
}

export function effectBodyToRawrEffect<TOutput, TError, TContext, TRequirements>(
  body: EffectBody<TContext, TOutput, TError, TRequirements>,
  context: TContext,
): RawrEffect<TOutput, TError, TRequirements> {
  const result = body(context);
  if (!isGeneratorResult(result)) return result;

  return Effect.gen(function* () {
    return yield* (result as Generator<
      RawrEffect<unknown, TError, TRequirements>,
      TOutput,
      unknown
    >);
  });
}

export { Exit };
