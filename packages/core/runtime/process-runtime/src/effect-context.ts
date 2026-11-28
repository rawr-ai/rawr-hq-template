import type { WithEffectContext } from "@orpc/effect";

/** Native wiring only; a Context value neither acquires nor owns its resources. */
export type EffectContext<Requirements = never> = WithEffectContext<Requirements>["effect/context"];
