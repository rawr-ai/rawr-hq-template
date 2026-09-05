import type { WithEffectContext } from "@orpc/experimental-effect";

/** The official bridge executes the result; Habitat supplies only decoration. */
export type EffectWrap = NonNullable<WithEffectContext<never>["effect/wrap"]>;
