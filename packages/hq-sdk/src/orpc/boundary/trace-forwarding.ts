type CorrelationContext = Readonly<{
  correlationId: string;
}>;

export type InternalClientTraceForwardingOptions = Readonly<{
  context: Readonly<{
    invocation: Readonly<{
      traceId: string;
    }>;
  }>;
}>;

export function createInternalTraceForwardingOptions(
  context: CorrelationContext,
): InternalClientTraceForwardingOptions {
  return {
    context: {
      invocation: {
        traceId: context.correlationId,
      },
    },
  };
}

export type ServiceInvocationOptions = InternalClientTraceForwardingOptions;

/**
 * Construct per-call options for in-process service-package clients.
 *
 * Service clients receive deps/scope/config at construction time, but oRPC
 * invocation context is intentionally supplied for each procedure call so logs,
 * analytics, and spans can attribute work to the actual operation.
 */
export function createServiceInvocationOptions(traceId: string): ServiceInvocationOptions {
  return createInternalTraceForwardingOptions({ correlationId: traceId });
}
