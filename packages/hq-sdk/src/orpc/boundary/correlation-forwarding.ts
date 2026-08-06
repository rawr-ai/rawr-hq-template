type CorrelationContext = Readonly<{
  correlationId: string;
}>;

/**
 * Local oRPC call options that carry request correlation into a sealed service
 * without treating caller data as OpenTelemetry trace authority.
 */
export type InternalClientCorrelationForwardingOptions = Readonly<{
  context: Readonly<{
    invocation: Readonly<{
      correlationId: string;
    }>;
  }>;
}>;

/**
 * Projects an API boundary's correlation identity into the downstream
 * service invocation lane while native OpenTelemetry context owns tracing.
 */
export function createInternalCorrelationForwardingOptions(
  context: CorrelationContext
): InternalClientCorrelationForwardingOptions {
  return {
    context: {
      invocation: {
        correlationId: context.correlationId,
      },
    },
  };
}
