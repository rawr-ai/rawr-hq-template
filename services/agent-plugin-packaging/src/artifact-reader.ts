import type {
  ArtifactRef,
  VerifiedArtifactSnapshotV1,
} from "@rawr/agent-plugin-release";

export interface ArtifactReadIssue {
  readonly code:
    | "InvalidStoreRoot"
    | "MissingEntry"
    | "UnexpectedEntry"
    | "InvalidEntryType"
    | "SharedInode"
    | "ModeMismatch"
    | "DigestMismatch"
    | "MalformedEnvelope"
    | "ReferenceMismatch"
    | "ReadFailure";
  readonly detail: string;
}

export type ArtifactReadResult =
  | { readonly kind: "Verified"; readonly snapshot: VerifiedArtifactSnapshotV1 }
  | { readonly kind: "Missing"; readonly ref: ArtifactRef }
  | {
    readonly kind: "Mismatch";
    readonly ref: ArtifactRef;
    readonly issues: readonly [ArtifactReadIssue, ...ArtifactReadIssue[]];
  };

export interface ArtifactReader {
  read(ref: ArtifactRef): Promise<ArtifactReadResult>;
}
