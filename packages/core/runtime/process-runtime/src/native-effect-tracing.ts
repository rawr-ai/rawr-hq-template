import * as OtelTracer from "@effect/opentelemetry/OtelTracer";
import { context, isSpanContextValid, trace } from "@opentelemetry/api";
import { Effect } from "effect";

/** Reuse the configured native provider and active oRPC parent without owning another runtime. */
export function withNativeEffectTracing<A, E, R>(
  program: Effect.Effect<A, E, R>,
  name: string,
  attributes: Readonly<Record<string, string>>
): Effect.Effect<A, E, R> {
  const parent = trace.getSpan(context.active())?.spanContext();
  const spanned = Effect.withSpan(program, name, { attributes });
  const continued =
    parent !== undefined && isSpanContextValid(parent)
      ? OtelTracer.withSpanContext(spanned, parent)
      : spanned;
  return Effect.flatMap(
    Effect.provideService(
      OtelTracer.make,
      OtelTracer.OtelTracer,
      trace.getTracer("habitat.runtime")
    ),
    (tracer) => Effect.withTracer(continued, tracer)
  );
}
