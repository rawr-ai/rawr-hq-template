import { SpanStatusCode, trace, type Span } from "@opentelemetry/api";

export function getActiveSpan(): Span | undefined {
  return trace.getActiveSpan();
}

export function getTraceId(span: Span | undefined): string | undefined {
  return span?.spanContext().traceId;
}

export function setSpanError(span: Span | undefined, message: string): void {
  span?.setStatus({
    code: SpanStatusCode.ERROR,
    message,
  });
}
