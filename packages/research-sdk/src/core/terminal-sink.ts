import type { Effect } from "effect";

export type ReadExact<Output> =
  | { readonly kind: "Absent" }
  | { readonly kind: "Found"; readonly value: Output };

export type CreateOutcome<Output, Uncertainty> =
  | { readonly kind: "Created" }
  | { readonly kind: "Existing"; readonly value: Output }
  | { readonly kind: "Unknown"; readonly uncertainty: Uncertainty };

export interface DurableOutputSink<Key, Output, Uncertainty, Error, Requirements = never> {
  readonly readExact: (key: Key) => Effect.Effect<ReadExact<Output>, Error, Requirements>;
  readonly createIfAbsent: (
    output: Output
  ) => Effect.Effect<CreateOutcome<Output, Uncertainty>, Error, Requirements>;
  readonly readAfterUnknown: (
    key: Key,
    uncertainty: Uncertainty
  ) => Effect.Effect<ReadExact<Output>, Error, Requirements>;
}
