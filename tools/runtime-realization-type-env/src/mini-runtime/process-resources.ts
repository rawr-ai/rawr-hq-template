import {
  Chunk,
  Deferred,
  Effect as VendorEffect,
  PubSub,
  Queue,
  Ref,
  Schedule,
  Stream,
} from "effect";

export interface ProcessLocalResourceProbeResult {
  readonly queueValue: number;
  readonly pubSubValue: string;
  readonly refValue: number;
  readonly deferredValue: string;
  readonly scheduleOutput: number;
  readonly streamValues: readonly number[];
}

export const processLocalResourceProbe =
  VendorEffect.gen(function* () {
    const queue = yield* Queue.unbounded<number>();
    yield* Queue.offer(queue, 7);
    const queueValue = yield* Queue.take(queue);

    const pubSub = yield* PubSub.unbounded<string>();
    const pubSubValue = yield* VendorEffect.scoped(
      VendorEffect.gen(function* () {
        const subscription = yield* PubSub.subscribe(pubSub);
        yield* PubSub.publish(pubSub, "local-message");
        return yield* Queue.take(subscription);
      }),
    );

    const ref = yield* Ref.make(1);
    yield* Ref.update(ref, (value) => value + 1);
    const refValue = yield* Ref.get(ref);

    const deferred = yield* Deferred.make<string>();
    yield* Deferred.succeed(deferred, "deferred-ready");
    const deferredValue = yield* Deferred.await(deferred);

    let repetitions = 0;
    const scheduleOutput = yield* VendorEffect.repeat(
      VendorEffect.sync(() => {
        repetitions += 1;
        return repetitions;
      }),
      Schedule.recurs(2),
    );

    const streamChunk = yield* Stream.runCollect(Stream.fromIterable([1, 2, 3]));

    return {
      queueValue,
      pubSubValue,
      refValue,
      deferredValue,
      scheduleOutput,
      streamValues: Chunk.toArray(streamChunk),
    } satisfies ProcessLocalResourceProbeResult;
  });
