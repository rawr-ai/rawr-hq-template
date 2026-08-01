import { AsyncLocalStorage } from "node:async_hooks";
import { resolve } from "node:path";
import nodeProcess from "node:process";
import type { InquiryDefinition } from "./definition";
import { FlureeClient, type FlureeReadClient } from "./fluree-client";
import { type FlureeProcessOptions, withFlureeProcess } from "./fluree-process";

export interface TemporalInquiryReadOperationContext {
  readonly access: "read";
  readonly client: FlureeReadClient;
}

export interface TemporalInquiryWriteOperationContext {
  readonly access: "write";
  readonly client: FlureeClient;
}

export type TemporalInquiryOperationContext =
  | TemporalInquiryReadOperationContext
  | TemporalInquiryWriteOperationContext;

export interface TemporalInquirySessionOptions
  extends Omit<FlureeProcessOptions, "access" | "port" | "storagePath"> {
  readonly definition: InquiryDefinition;
  readonly indexTimeoutMs?: number;
  readonly readyTimeoutMs?: number;
  readonly root: string;
}

export interface TemporalInquirySession {
  read<Result>(use: (client: FlureeReadClient) => Promise<Result>): Promise<Result>;
  write<Result>(use: (client: FlureeClient) => Promise<Result>): Promise<Result>;
}

export interface TemporalInquiryReadOperationOptions extends TemporalInquirySessionOptions {
  readonly access: "read";
}

export interface TemporalInquiryWriteOperationOptions extends TemporalInquirySessionOptions {
  readonly access: "write";
}

export type TemporalInquiryOperationOptions =
  | TemporalInquiryReadOperationOptions
  | TemporalInquiryWriteOperationOptions;

type OperationOutcome<Result> =
  | { readonly ok: true; readonly value: Result }
  | { readonly error: unknown; readonly ok: false };

const temporalInquirySignals = ["SIGINT", "SIGTERM"] as const;
type TemporalInquirySignal = (typeof temporalInquirySignals)[number];

interface TemporalInquirySignalTarget {
  readonly pid: number;
  on(signal: TemporalInquirySignal, listener: () => void): unknown;
  removeListener(signal: TemporalInquirySignal, listener: () => void): unknown;
  kill(pid: number, signal: TemporalInquirySignal): boolean;
}

async function captureOutcome<Result>(
  operation: () => Promise<Result>
): Promise<OperationOutcome<Result>> {
  try {
    return { ok: true, value: await operation() };
  } catch (error) {
    return { error, ok: false };
  }
}

async function runWriteAndSeal<Result>(
  client: FlureeClient,
  indexTimeoutMs: number | undefined,
  use: () => Promise<Result>
): Promise<Result> {
  const callback = await captureOutcome(use);
  const seal = await captureOutcome(() => client.waitForIndex(indexTimeoutMs));
  if (!callback.ok && !seal.ok) {
    throw new AggregateError(
      [callback.error, seal.error],
      "Temporal inquiry write callback and index sealing both failed"
    );
  }
  if (!callback.ok) throw callback.error;
  if (!seal.ok) throw seal.error;
  return callback.value;
}

function runtimeOptions(options: TemporalInquirySessionOptions): FlureeProcessOptions {
  const endpoint = options.definition.runtime.endpoint;
  if (endpoint === undefined) {
    throw new Error("Temporal inquiry operation requires runtime.endpoint");
  }
  const storage = options.definition.runtime.storage;
  if (storage === undefined) {
    throw new Error("Temporal inquiry operation requires runtime.storage");
  }
  const url = new URL(endpoint);
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(url.hostname)) {
    throw new Error("Owned temporal inquiry runtime must use a local HTTP endpoint");
  }
  const port = url.port === "" ? 80 : Number(url.port);
  if (!Number.isSafeInteger(port) || port <= 0 || port > 65_535) {
    throw new Error("Temporal inquiry runtime endpoint must contain a valid TCP port");
  }
  return {
    access: "write",
    ...(options.cachePolicy === undefined ? {} : { cachePolicy: options.cachePolicy }),
    ...(options.cacheRoot === undefined ? {} : { cacheRoot: options.cacheRoot }),
    ...(options.executable === undefined ? {} : { executable: options.executable }),
    ...(options.signal === undefined ? {} : { signal: options.signal }),
    port,
    storagePath: resolve(options.root, storage),
  };
}

interface SerializedOperations {
  close(): void;
  drain(): Promise<readonly unknown[]>;
  run<Result>(operation: () => Promise<Result>): Promise<Result>;
}

function serializeOperations(): SerializedOperations {
  const closedError = new Error("Temporal inquiry session is closed");
  const failures: unknown[] = [];
  let accepting = true;
  let tail: Promise<void> = Promise.resolve();
  return {
    close() {
      accepting = false;
    },
    async drain() {
      await tail;
      return [...failures];
    },
    run<Result>(operation: () => Promise<Result>): Promise<Result> {
      if (!accepting) return Promise.reject(closedError);
      const current = tail.then(operation);
      tail = current.then(
        () => undefined,
        (error: unknown) => {
          failures.push(error);
        }
      );
      return current;
    },
  };
}

function finishSession<Result>(
  callback: OperationOutcome<Result>,
  operationFailures: readonly unknown[]
): Result {
  if (callback.ok) {
    if (operationFailures.length === 0) return callback.value;
    if (operationFailures.length === 1) throw operationFailures[0];
    throw new AggregateError(operationFailures, "Temporal inquiry session operations failed");
  }

  const distinctOperationFailures = [...operationFailures];
  const duplicate = distinctOperationFailures.findIndex((error) =>
    Object.is(error, callback.error)
  );
  if (duplicate >= 0) distinctOperationFailures.splice(duplicate, 1);
  if (distinctOperationFailures.length === 0) throw callback.error;
  throw new AggregateError(
    [callback.error, ...distinctOperationFailures],
    "Temporal inquiry session callback and queued operations failed"
  );
}

/**
 * Reuse one foreground, write-capable Fluree process for serialized inquiry work.
 *
 * Native indexing stays enabled for the complete scope. Reads seal the current
 * ledger head before exposing a capability-limited client; writes publish their
 * result only after their final index seal succeeds. When the session callback
 * settles, no new calls are admitted and all admitted calls drain before the
 * process scope closes. Any failed call poisons that drain, including a failure
 * whose returned promise was ignored or caught by the callback. Calls made from
 * inside another session operation are rejected rather than deadlocking on the
 * non-reentrant queue.
 */
export function withTemporalInquirySession<Result>(
  options: TemporalInquirySessionOptions,
  use: (session: TemporalInquirySession) => Promise<Result>
): Promise<Result> {
  return withFlureeProcess(runtimeOptions(options), async (runtime) => {
    const clientOptions = {
      endpoint: runtime.endpoint,
      ...(options.indexTimeoutMs === undefined ? {} : { indexTimeoutMs: options.indexTimeoutMs }),
      ledger: options.definition.ledger,
      signal: runtime.signal,
    };
    const writeClient = new FlureeClient({ ...clientOptions, access: "write" });
    const readClient = new FlureeClient({ ...clientOptions, access: "read" });
    await writeClient.waitForReady(options.readyTimeoutMs);
    await writeClient.assertBackgroundIndexing(true);

    const operations = serializeOperations();
    const operationContext = new AsyncLocalStorage<boolean>();
    const nestedOperationError = new Error("Temporal inquiry session operations cannot be nested");
    const runOperation = <OperationResult>(
      operation: () => Promise<OperationResult>
    ): Promise<OperationResult> => {
      if (operationContext.getStore() === true) return Promise.reject(nestedOperationError);
      return operations.run(() => operationContext.run(true, operation));
    };
    const session: TemporalInquirySession = {
      read: <ReadResult>(
        read: (client: FlureeReadClient) => Promise<ReadResult>
      ): Promise<ReadResult> =>
        runOperation(async () => {
          runtime.signal.throwIfAborted();
          await writeClient.waitForIndex(options.indexTimeoutMs);
          return read(readClient);
        }),
      write: <WriteResult>(
        write: (client: FlureeClient) => Promise<WriteResult>
      ): Promise<WriteResult> =>
        runOperation(() => {
          runtime.signal.throwIfAborted();
          return runWriteAndSeal(writeClient, options.indexTimeoutMs, () => write(writeClient));
        }),
    };
    const callback = await captureOutcome(() => use(session));
    operations.close();
    const operationFailures = await operations.drain();
    return finishSession(callback, operationFailures);
  });
}

/**
 * Own SIGINT/SIGTERM only around one repository CLI operation.
 *
 * The first signal cooperatively interrupts the exact Fluree scope. Listeners
 * are removed before aborting so a second signal keeps the host's ordinary
 * hard-stop behavior. After cleanup, the first signal is re-delivered to
 * preserve its native process exit status.
 */
export async function runTemporalInquiryCommand<Result>(
  operation: (signal: AbortSignal) => Promise<Result>,
  signalTarget: TemporalInquirySignalTarget = nodeProcess
): Promise<Result> {
  const abortController = new AbortController();
  let interruptedBy: TemporalInquirySignal | undefined;
  const listeners = temporalInquirySignals.map(
    (signal) =>
      [
        signal,
        () => {
          if (interruptedBy !== undefined) return;
          interruptedBy = signal;
          removeListeners();
          abortController.abort(new Error(`Temporal inquiry command interrupted by ${signal}`));
        },
      ] as const
  );
  const removeListeners = () => {
    for (const [signal, listener] of listeners) {
      signalTarget.removeListener(signal, listener);
    }
  };
  for (const [signal, listener] of listeners) signalTarget.on(signal, listener);

  try {
    return await operation(abortController.signal);
  } finally {
    removeListeners();
    if (interruptedBy !== undefined) {
      signalTarget.kill(signalTarget.pid, interruptedBy);
    }
  }
}

/**
 * Execute one temporal-inquiry call through a fresh foreground session.
 *
 * CI and other cold-path callers keep a one-call boundary while interactive
 * consumers can reuse `withTemporalInquirySession` for warm serialized calls.
 */
export function runTemporalInquiryOperation<Result>(
  options: TemporalInquiryReadOperationOptions,
  use: (context: TemporalInquiryReadOperationContext) => Promise<Result>
): Promise<Result>;
export function runTemporalInquiryOperation<Result>(
  options: TemporalInquiryWriteOperationOptions,
  use: (context: TemporalInquiryWriteOperationContext) => Promise<Result>
): Promise<Result>;
export function runTemporalInquiryOperation<Result>(
  options: TemporalInquiryOperationOptions,
  use: (context: TemporalInquiryOperationContext) => Promise<Result>
): Promise<Result>;
export function runTemporalInquiryOperation<Result>(
  options: TemporalInquiryOperationOptions,
  use:
    | ((context: TemporalInquiryReadOperationContext) => Promise<Result>)
    | ((context: TemporalInquiryWriteOperationContext) => Promise<Result>)
): Promise<Result> {
  return withTemporalInquirySession(options, (session) => {
    if (isReadOperation(options, use)) {
      return session.read((client) => use({ access: "read", client }));
    }
    return session.write((client) => use({ access: "write", client }));
  });
}

function isReadOperation<Result>(
  options: TemporalInquiryOperationOptions,
  _use:
    | ((context: TemporalInquiryReadOperationContext) => Promise<Result>)
    | ((context: TemporalInquiryWriteOperationContext) => Promise<Result>)
): _use is (context: TemporalInquiryReadOperationContext) => Promise<Result> {
  return options.access === "read";
}
