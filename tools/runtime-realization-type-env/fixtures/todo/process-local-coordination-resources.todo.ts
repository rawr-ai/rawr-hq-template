import type { RawrEffect } from "@rawr/sdk/effect";

// TODO/P1: settle the first process-local coordination resource contracts.
//
// These resources are local runtime infrastructure. They must not become
// durable async, cross-process eventing, workflow history, workstream state, or
// domain truth.

export interface ProcessQueue<T> {
  offer(value: T): RawrEffect<void, ProcessQueueOfferError>;
  take(): RawrEffect<T, ProcessQueueTakeError>;
}

export interface ProcessPubSub<T> {
  publish(value: T): RawrEffect<void>;
  subscribe(): RawrEffect<AsyncIterable<T>>;
}

export interface ProcessConcurrencyLimiter {
  withPermit<TSuccess, TError, TRequirements>(input: {
    readonly key: string;
    readonly permits: number;
    readonly effect: RawrEffect<TSuccess, TError, TRequirements>;
  }): RawrEffect<TSuccess, TError, TRequirements>;
}

export interface ProcessCache<TKey, TValue> {
  get(key: TKey): RawrEffect<TValue>;
  refresh(key: TKey): RawrEffect<TValue>;
  invalidate(key: TKey): RawrEffect<void>;
  invalidateAll(): RawrEffect<void>;
}

export interface ProcessQueueOfferError {
  readonly _tag: "ProcessQueueOfferError";
  readonly queueId: string;
}

export interface ProcessQueueTakeError {
  readonly _tag: "ProcessQueueTakeError";
  readonly queueId: string;
}
