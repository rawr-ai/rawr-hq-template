import { wrapAsyncIteratorPreservingEventMeta } from "@orpc/client";
import { isAsyncIteratorObject, override, wrapReadableStream } from "@orpc/shared";
import { Context, Exit, Fiber } from "effect";

const continuationTypeId = Symbol("habitat.invocation-continuation");

export interface Continuation {
  readonly [continuationTypeId]: true;
}

const invocationContinuation = Context.Reference<Continuation | undefined>(
  "habitat/process-runtime/invocation-continuation",
  { defaultValue: () => undefined }
);

export function invocationContinuationContext(continuation: Continuation): Context.Context<never> {
  return Context.make(invocationContinuation, continuation);
}

export interface InvocationTracker {
  assertOpen(): void;
  captureContinuation(): Continuation | undefined;
  assertAdmission(parent?: Continuation): void;
  run<T>(operation: (own: Continuation) => Promise<T>, parent?: Continuation): Promise<T>;
  runExit<A, E>(
    operation: (own: Continuation) => Promise<Exit.Exit<A, E>>,
    parent?: Continuation
  ): Promise<Exit.Exit<A, E>>;
  group(): InvocationGroup;
  closeAndDrain(): Promise<void>;
}

/** One native owner's view of the process's existing invocation leases. */
export interface InvocationGroup {
  run<T>(operation: (own: Continuation) => Promise<T>, parent?: Continuation): Promise<T>;
  closeAndDrain(): Promise<void>;
}

interface GroupState {
  open: boolean;
  pending: number;
  drain?: Promise<void>;
  settle?: () => void;
}

/** Native completion, not caller cancellation, determines when resources can be released. */
export function createInvocationTracker(): InvocationTracker {
  let open = true;
  const active = new Map<Continuation, GroupState | undefined>();
  let settle: (() => void) | undefined;
  let drain: Promise<void> | undefined;

  function assertOpen(): void {
    if (!open) throw new TypeError("Process invocation admission is closed.");
  }

  function assertAdmission(parent?: Continuation): void {
    if (parent === undefined) return assertOpen();
    if (!active.has(parent)) {
      throw new TypeError("Invocation continuation is expired or belongs to another process.");
    }
  }

  function retainOutput<T>(output: T, retain: () => () => void): T {
    if (!isAsyncIteratorObject(output) && !(output instanceof ReadableStream)) return output;
    const release = retain();
    let finished = false;
    let operations = 0;
    const complete = () => {
      if (finished && operations === 0) release();
    };
    const hooks = {
      async runWith<A>(run: () => Promise<A>): Promise<A> {
        operations += 1;
        try {
          return await run();
        } finally {
          operations -= 1;
          complete();
        }
      },
      onFinish(): void {
        finished = true;
        complete();
      },
    };
    try {
      // Native return() can finish while an earlier next() is still pending.
      const wrapped = isAsyncIteratorObject(output)
        ? override(output, wrapAsyncIteratorPreservingEventMeta(output, hooks))
        : override(output, wrapReadableStream(output, hooks));
      // Native override preserves the output's extra properties while replacing its stream methods.
      return wrapped as T;
    } catch (error) {
      release();
      throw error;
    }
  }

  async function track<T>(
    operation: (own: Continuation) => Promise<T>,
    retain: (value: T, retainOutput: () => () => void) => T,
    parent?: Continuation,
    rootGroup?: GroupState
  ): Promise<T> {
    assertAdmission(parent);
    const group = parent === undefined ? rootGroup : active.get(parent);
    if (parent === undefined && group?.open === false)
      throw new TypeError("Native invocation admission is closed.");
    const continuation = Object.freeze<Continuation>({ [continuationTypeId]: true });
    active.set(continuation, group);
    if (group !== undefined) group.pending += 1;
    // A returned native stream extends this same invocation, not a fresh admission lease.
    let requestSettled = false;
    let outputSettled = true;
    const complete = () => {
      if (!requestSettled || !outputSettled) return;
      if (!active.delete(continuation)) return;
      if (group !== undefined) {
        group.pending -= 1;
        if (!group.open && group.pending === 0) group.settle?.();
      }
      if (!open && active.size === 0) settle?.();
    };
    try {
      return retain(await operation(continuation), () => {
        outputSettled = false;
        return () => {
          outputSettled = true;
          complete();
        };
      });
    } finally {
      requestSettled = true;
      complete();
    }
  }

  return Object.freeze({
    assertOpen,
    captureContinuation(): Continuation | undefined {
      return Fiber.getCurrent()?.getRef(invocationContinuation);
    },
    assertAdmission,
    run<T>(operation: (own: Continuation) => Promise<T>, parent?: Continuation): Promise<T> {
      return track(operation, retainOutput, parent);
    },
    runExit<A, E>(
      operation: (own: Continuation) => Promise<Exit.Exit<A, E>>,
      parent?: Continuation
    ): Promise<Exit.Exit<A, E>> {
      return track(
        operation,
        (exit, retain) =>
          Exit.isSuccess(exit) ? Exit.succeed(retainOutput(exit.value, retain)) : exit,
        parent
      );
    },
    group(): InvocationGroup {
      assertOpen();
      const group: GroupState = { open: true, pending: 0 };
      return Object.freeze({
        run<T>(operation: (own: Continuation) => Promise<T>, parent?: Continuation): Promise<T> {
          return track(operation, retainOutput, parent, group);
        },
        closeAndDrain(): Promise<void> {
          if (group.drain !== undefined) return group.drain;
          group.open = false;
          group.drain = new Promise<void>((resolve) => {
            group.settle = resolve;
            if (group.pending === 0) resolve();
          });
          return group.drain;
        },
      });
    },
    closeAndDrain(): Promise<void> {
      if (drain !== undefined) return drain;
      open = false;
      drain = new Promise<void>((resolve) => {
        settle = resolve;
        if (active.size === 0) resolve();
      });
      return drain;
    },
  });
}
