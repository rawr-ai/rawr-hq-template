import type { RawrEffect } from "@rawr/sdk/effect";

// TODO/P1: decide the final curated Effect composition surface.
//
// Safe candidates include native-shaped construction/composition helpers such
// as succeed, fail, tryPromise, all, timeout, retry, catchTag, catchAll, map,
// flatMap, tap, withSpan, root pipe, and value .pipe(...). Unsafe candidates
// include runtime execution, raw Layer/Scope construction, Context.Tag, raw
// Queue/PubSub constructors, Fiber daemonization, and durable Schedule/Stream
// semantics.

export interface ExpectedSafeEffectCompositionSurface {
  readonly effectValue: RawrEffect<unknown, unknown, unknown>;
  readonly pipeSpelling: "root-pipe-or-value-pipe";
  readonly rawRuntimeConstructors: "forbidden";
  readonly vendorParity: "verified-before-promoting-to-proof";
}
