import { isSpanContextValid, context as otelContext, trace } from "@opentelemetry/api";
import type { WithEffectContext } from "@orpc/experimental-effect";
import { ORPCError } from "@orpc/server";
import type { StandardHandlerOptions } from "@orpc/server/standard";
import { Cause, Context, Effect, Exit } from "effect";

import type { CompiledSurfacePlan } from "../../compiler/src/compiled-process-plan";
import type { RuntimeLaunchIdentity } from "../../definition/src/app";
import type { RuntimeObservationPort } from "../../definition/src/observation";
import type { ServerPluginContext } from "../../definition/src/plugin";
import type { RuntimeResourceMap } from "../../definition/src/provider";
import {
  type Continuation,
  type InvocationTracker,
  invocationContinuationContext,
} from "./invocation-tracker";
import { withNativeEffectTracing } from "./native-effect-tracing";
import type { BoundServiceBindingMap } from "./surface-adapter";

export type NativeServerRequestContext = ServerPluginContext;

export interface NativeServerRequestAssembly {
  context(request: Request): NativeServerRequestContext;
  readonly clientInterceptors: NonNullable<
    StandardHandlerOptions<NativeServerRequestContext>["clientInterceptors"]
  >;
}

/** The native procedure boundary, before serialization, retains returned streams on its own lease. */
export function createNativeServerRequestAssembly(input: {
  readonly identity: RuntimeLaunchIdentity;
  readonly surface: CompiledSurfacePlan;
  readonly admission: InvocationTracker;
  readonly capabilities: (continuation?: Continuation) => {
    readonly clients: BoundServiceBindingMap;
    readonly resources: RuntimeResourceMap;
  };
  readonly observation?: RuntimeObservationPort;
}): NativeServerRequestAssembly {
  const base = input.capabilities();
  return Object.freeze<NativeServerRequestAssembly>({
    context(request: Request): NativeServerRequestContext {
      input.admission.assertOpen();
      return { request, ...base, "effect/context": Context.empty() };
    },
    clientInterceptors: [
      ({ next, ...options }) =>
        input.admission.run(async (lease) => {
          const nativeSpan = trace.getSpan(otelContext.active())?.spanContext();
          let traceId =
            nativeSpan !== undefined && isSpanContextValid(nativeSpan)
              ? nativeSpan.traceId
              : undefined;
          let nativeEffect:
            | {
                readonly typedFailure: boolean;
                readonly defect: boolean;
                readonly interrupted: boolean;
              }
            | undefined;
          const wrap: NonNullable<WithEffectContext<never>["effect/wrap"]> = (program) =>
            withNativeEffectTracing(
              Effect.gen(function* () {
                const span = yield* Effect.orDie(Effect.currentSpan);
                if (
                  isSpanContextValid({
                    traceId: span.traceId,
                    spanId: span.spanId,
                    traceFlags: span.sampled ? 1 : 0,
                  })
                )
                  traceId = span.traceId;
                return yield* program.pipe(
                  Effect.onExit((exit) =>
                    Effect.sync(() => {
                      nativeEffect = Object.freeze({
                        typedFailure: Exit.isFailure(exit) && Cause.hasFails(exit.cause),
                        defect: Exit.isFailure(exit) && Cause.hasDies(exit.cause),
                        interrupted: Exit.isFailure(exit) && Cause.hasInterrupts(exit.cause),
                      });
                    })
                  )
                );
              }),
              "server.operation",
              {
                "habitat.app": input.identity.app,
                "habitat.process": input.identity.process,
                "habitat.surface": input.surface.surfacePlanId,
                "rpc.method": options.path.join("."),
              }
            );
          function publish(outcome: "returned" | "rejected", error?: unknown): void {
            try {
              const result: unknown = input.observation?.publish({
                phase: "observation",
                boundary: "runtime-process-runtime",
                kind: "server.procedure.settled",
                correlationId: input.identity.process,
                payload: Object.freeze({
                  identity: input.identity,
                  surfacePlanId: input.surface.surfacePlanId,
                  path: Object.freeze([...options.path]),
                  outcome,
                  ...(error instanceof ORPCError ? { errorCode: error.code } : {}),
                  ...(nativeEffect === undefined ? {} : { nativeEffect }),
                  ...(traceId === undefined ? {} : { traceId }),
                }),
              });
              // Observers do not join the product invocation or replace its native outcome.
              void Promise.resolve(result).catch(() => undefined);
            } catch {
              // Product output, error identity, and native cleanup remain authoritative.
            }
          }
          try {
            const output = await next({
              ...options,
              context: {
                ...options.context,
                ...input.capabilities(lease),
                "effect/context": invocationContinuationContext(lease),
                "effect/wrap": wrap,
              },
            });
            // This is procedure return, not a claim that a returned stream has drained.
            publish("returned");
            return output;
          } catch (error) {
            publish("rejected", error);
            throw error;
          }
        }),
    ],
  });
}
