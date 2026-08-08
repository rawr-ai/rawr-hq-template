import { type Span, SpanStatusCode, trace } from "@opentelemetry/api";

/** Returns the span already owned by the host's active OpenTelemetry context. */
export function getActiveSpan(): Span | undefined {
  return trace.getActiveSpan();
}

/** Projects the active trace identity into structured procedure diagnostics. */
export function getTraceId(span: Span | undefined): string | undefined {
  return span?.spanContext().traceId;
}

/** Marks the existing span as failed without taking ownership of span lifetime. */
export function setSpanError(span: Span | undefined, message: string): void {
  span?.setStatus({
    code: SpanStatusCode.ERROR,
    message,
  });
}
