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
