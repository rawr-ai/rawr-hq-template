export type NativeProvenanceAmbiguityReason =
  | "duplicate-managed-marketplace"
  | "managed-marketplace-metadata-invalid"
  | "managed-marketplace-owner-mismatch"
  | "managed-member-owner-mismatch"
  | "managed-plugin-provenance-invalid";

export class NativeProvenanceAmbiguity extends Error {
  readonly kind = "native-provenance-ambiguity";

  constructor(
    readonly reason: NativeProvenanceAmbiguityReason,
    detail?: unknown
  ) {
    super(detail instanceof Error ? detail.message : String(detail ?? reason));
    this.name = "NativeProvenanceAmbiguity";
  }
}

export function isNativeProvenanceAmbiguity(error: unknown): error is NativeProvenanceAmbiguity {
  return error instanceof NativeProvenanceAmbiguity;
}
