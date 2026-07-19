export type NativeProviderResourceFailureKind =
  | "ownership-conflict"
  | "pre-mutation-refusal"
  | "provider-failure";

/** Classifies native resource failures at the provider-domain boundary. */
export class NativeProviderResourceFailure extends Error {
  readonly _tag = "NativeProviderResourceFailure" as const;
  readonly kind: NativeProviderResourceFailureKind;
  readonly path: string | undefined;

  constructor(input: Readonly<{
    kind: NativeProviderResourceFailureKind;
    detail: string;
    path: string | undefined;
  }>) {
    super(input.detail);
    this.name = "NativeProviderResourceFailure";
    this.kind = input.kind;
    this.path = input.path;
  }
}
