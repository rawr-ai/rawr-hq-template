import { context as otelContext, propagation, type TextMapGetter } from "@opentelemetry/api";

const headersGetter: TextMapGetter<Headers> = {
  get(carrier, key) {
    return carrier.get(key) ?? undefined;
  },
  keys(carrier) {
    const keys: string[] = [];
    carrier.forEach((_value, key) => keys.push(key));
    return keys;
  },
};

/** Extracts the remote OpenTelemetry context at one physical HTTP ingress. */
export function extractIngressTelemetryContext(headers: Headers) {
  return propagation.extract(otelContext.active(), headers, headersGetter);
}
