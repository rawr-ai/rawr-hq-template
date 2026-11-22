import type { WithEffectContext } from "@orpc/effect";

/** The official bridge executes the result; Habitat supplies only decoration. */
export type EffectWrap = NonNullable<WithEffectContext<never>["effect/wrap"]>;
