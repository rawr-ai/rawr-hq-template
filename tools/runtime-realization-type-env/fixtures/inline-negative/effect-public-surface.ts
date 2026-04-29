import { Effect } from "@rawr/sdk/effect";

// @ts-expect-error public Effect facade must not export raw ManagedRuntime.
import type { ManagedRuntime } from "@rawr/sdk/effect";

// @ts-expect-error public Effect facade must not export raw Layer.
import type { Layer } from "@rawr/sdk/effect";

// @ts-expect-error public Effect facade must not export raw Queue.
import type { Queue } from "@rawr/sdk/effect";

// @ts-expect-error public Effect facade must not export raw PubSub.
import type { PubSub } from "@rawr/sdk/effect";

// @ts-expect-error public Effect facade must not export raw Stream.
import type { Stream } from "@rawr/sdk/effect";

// @ts-expect-error public Effect facade must not export raw Schedule.
import type { Schedule } from "@rawr/sdk/effect";

// @ts-expect-error verified vendor spelling is root pipe or value .pipe(...), not Effect.pipe.
Effect.pipe;

void (undefined as unknown as ManagedRuntime);
void (undefined as unknown as Layer);
void (undefined as unknown as Queue);
void (undefined as unknown as PubSub);
void (undefined as unknown as Stream);
void (undefined as unknown as Schedule);
