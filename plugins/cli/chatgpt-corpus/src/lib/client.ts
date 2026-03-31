import { createClient } from "@rawr/chatgpt-corpus";
import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";

export function createCorpusClient() {
  return createClient({
    deps: {
      logger: createEmbeddedPlaceholderLoggerAdapter(),
      analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
    },
    scope: {},
    config: {},
  });
}

export function createInvocation(traceId: string) {
  return {
    context: {
      invocation: {
        traceId,
      },
    },
  } as const;
}

export function describeServiceError(error: unknown): {
  message: string;
  code?: string;
  details?: unknown;
} {
  if (error && typeof error === "object") {
    const typed = error as {
      message?: unknown;
      code?: unknown;
      data?: unknown;
    };
    return {
      message: typeof typed.message === "string" && typed.message.trim() !== "" ? typed.message : String(error),
      code: typeof typed.code === "string" ? typed.code : undefined,
      details: typed.data,
    };
  }

  return { message: String(error) };
}
