import { AsyncLocalStorage } from "node:async_hooks";
import path from "node:path";
import process from "node:process";
import { trace, type SpanContext } from "@opentelemetry/api";
import pino, { type DestinationStream, type Logger as PinoLogger } from "pino";

type ServiceLogger = {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
};

export type HostLoggingSurface = "rpc" | "openapi";

export type HostLoggingContext = {
  repoRoot: string;
  requestId: string;
  correlationId: string;
  requestMethod: string;
  requestPath: string;
  surface: HostLoggingSurface;
  callerSurface?: string;
};

const hostLoggingContext = new AsyncLocalStorage<HostLoggingContext>();
const hostLoggingSpanContext = new AsyncLocalStorage<Pick<SpanContext, "traceId" | "spanId">>();

// Keep one destination-backed logger per repo root so HQ writes a single
// runtime log stream even when many routed requests pass through the host.
const hostLoggersByRepoRoot = new Map<string, PinoLogger>();
let hostLoggerOverrideDestination: DestinationStream | undefined;
let fallbackHostLogger = createPinoLogger();

function createPinoLogger(destination: DestinationStream = process.stdout): PinoLogger {
  return pino({
    base: null,
    messageKey: "message",
    timestamp: pino.stdTimeFunctions.isoTime,
  }, destination);
}

function createFileDestination(repoRoot: string): DestinationStream {
  return pino.destination({
    dest: path.join(repoRoot, ".rawr", "hq", "runtime.log"),
    mkdir: true,
    sync: true,
  });
}

function resolveHostLogger(): PinoLogger {
  const context = hostLoggingContext.getStore();

  // Tests and non-request code paths still need a usable logger even when
  // there is no host request context to resolve a repo-local runtime log file.
  if (!context) {
    return fallbackHostLogger;
  }

  const existing = hostLoggersByRepoRoot.get(context.repoRoot);
  if (existing) {
    return existing;
  }

  const logger = createPinoLogger(hostLoggerOverrideDestination ?? createFileDestination(context.repoRoot));
  hostLoggersByRepoRoot.set(context.repoRoot, logger);
  return logger;
}

function flushHostLogger(): void {
  if ("flush" in fallbackHostLogger && typeof fallbackHostLogger.flush === "function") {
    fallbackHostLogger.flush();
  }

  for (const logger of hostLoggersByRepoRoot.values()) {
    if ("flush" in logger && typeof logger.flush === "function") {
      logger.flush();
    }
  }
}

function getCorrelationFields(): Record<string, unknown> {
  const context = hostLoggingContext.getStore();
  const storedSpanContext = hostLoggingSpanContext.getStore();
  const activeSpan = trace.getActiveSpan()?.spanContext();
  const traceId = storedSpanContext?.traceId ?? activeSpan?.traceId;
  const spanId = storedSpanContext?.spanId ?? activeSpan?.spanId;

  return {
    ...(context ? {
      requestId: context.requestId,
      correlationId: context.correlationId,
      requestMethod: context.requestMethod,
      requestPath: context.requestPath,
      surface: context.surface,
      ...(context.callerSurface ? { callerSurface: context.callerSurface } : {}),
    } : {}),
    ...(traceId ? { traceId } : {}),
    ...(spanId ? { spanId } : {}),
  };
}

function emit(level: "info" | "error", event: string, meta?: Record<string, unknown>): void {
  const payload = meta ?? {};
  resolveHostLogger()[level]({
    event,
    ...payload,
    ...getCorrelationFields(),
  }, event);
}

export function createHostLoggerAdapter(): ServiceLogger {
  return {
    info(event, meta) {
      emit("info", event, meta);
    },
    error(event, meta) {
      emit("error", event, meta);
    },
  };
}

export function createHostLoggingContext(args: {
  request: Request;
  repoRoot: string;
  requestId: string;
  correlationId: string;
  surface: HostLoggingSurface;
}): HostLoggingContext {
  const url = new URL(args.request.url);
  const callerSurface = args.request.headers.get("x-rawr-caller-surface")?.trim();

  return {
    repoRoot: args.repoRoot,
    requestId: args.requestId,
    correlationId: args.correlationId,
    requestMethod: args.request.method,
    requestPath: url.pathname,
    surface: args.surface,
    ...(callerSurface ? { callerSurface } : {}),
  };
}

export async function withHostLoggingContext<T>(
  context: HostLoggingContext,
  fn: () => Promise<T>,
): Promise<T> {
  return hostLoggingContext.run(context, fn);
}

export async function withHostLoggingSpanContext<T>(
  spanContext: Pick<SpanContext, "traceId" | "spanId"> | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  if (!spanContext) {
    return fn();
  }

  // The route span is the canonical host-owned correlation seam, so persist
  // its identifiers even if downstream code switches active tracing context.
  return hostLoggingSpanContext.run(spanContext, fn);
}

export function __configureHostLoggerForTests(options: {
  destination?: DestinationStream;
} = {}): void {
  flushHostLogger();
  hostLoggersByRepoRoot.clear();
  hostLoggerOverrideDestination = options.destination;
  fallbackHostLogger = createPinoLogger(options.destination ?? process.stdout);
}

export function __resetHostLoggerForTests(): void {
  __configureHostLoggerForTests();
}

export function __flushHostLoggerForTests(): void {
  flushHostLogger();
}
