import type {
  ContentTreeEntry,
  ContentWorkspaceIdentity,
  ContentWorkspaceWrite,
  MaterializedContentTreeEntry,
  RemoteContentTree,
} from "@rawr/resource-content-workspace";

import type { AgentPluginReleaseInput } from "../../../../shared/release";
import type { VendorContentWorkspaceRef } from "./vendor-operations";
import type {
  VendorLockRecord,
  VendorProvenanceRecord,
  VendorRecordBinding,
  VendorSourceDeclaration,
  VendorSourceIdentity,
} from "./vendor-records";

export type VendorDestinationObservation =
  | Readonly<{
      kind: "Present";
      entries: readonly ContentTreeEntry[];
      payloadDigest: string;
    }>
  | Readonly<{ kind: "Missing" }>
  | Readonly<{ kind: "Invalid"; detail: string }>;

export interface VendorDeclaredSourceObservation {
  readonly memberPluginId: string;
  readonly declarationBinding: VendorRecordBinding;
  readonly declarationContentDigest: string;
  readonly declaration: VendorSourceDeclaration;
  readonly provenanceBinding: VendorRecordBinding | null;
  readonly provenanceContentDigest: string | null;
  readonly provenance: VendorProvenanceRecord | null;
  readonly lockBinding: VendorRecordBinding | null;
  readonly lockContentDigest: string | null;
  readonly lock: VendorLockRecord | null;
  readonly destination: VendorDestinationObservation;
}

export interface VendorWorkspaceObservation {
  readonly contentWorkspace: Omit<VendorContentWorkspaceRef, "locator">;
  readonly workspaceIdentity: ContentWorkspaceIdentity;
  readonly releaseInput: AgentPluginReleaseInput;
  readonly releaseInputBytes: Uint8Array;
  readonly releaseInputContentDigest: string;
  /** Service-owned digest of every semantic byte and Git identity used by this operation. */
  readonly readToken: string;
  readonly sources: readonly VendorDeclaredSourceObservation[];
}

export interface VendorUpstreamObservation {
  readonly remote: RemoteContentTree;
  readonly identity: VendorSourceIdentity;
  readonly ancestry: "same" | "fast-forward" | "diverged";
}

export interface VendorPreparedPayload {
  readonly identity: VendorSourceIdentity;
  readonly entries: readonly MaterializedContentTreeEntry[];
  readonly observedAt: string;
}

export interface VendorSourceChange {
  readonly sourceId: string;
  readonly prior: VendorSourceIdentity;
  readonly next: VendorSourceIdentity;
  readonly memberPluginId: string;
  readonly declarationBinding: VendorRecordBinding;
  readonly provenanceBinding: VendorRecordBinding;
  readonly lockBinding: VendorRecordBinding;
  readonly nextRecords: Readonly<{
    declaration: VendorSourceDeclaration;
    provenance: VendorProvenanceRecord;
    lock: VendorLockRecord;
  }>;
  readonly payload: VendorPreparedPayload;
  readonly declarationPath: string;
  readonly destinationPath: string;
  readonly provenancePath: string;
  readonly lockPath: string;
}

export interface VendorExpectedTransition {
  readonly sourceId: string;
  readonly memberPluginId: string;
  readonly declarationBinding: VendorRecordBinding;
  readonly declarationContentDigest: string;
  readonly declaration: VendorSourceDeclaration;
  readonly provenanceBinding: VendorRecordBinding;
  readonly provenanceContentDigest: string;
  readonly provenance: VendorProvenanceRecord;
  readonly lockBinding: VendorRecordBinding;
  readonly lockContentDigest: string;
  readonly lock: VendorLockRecord;
  readonly destinationPayloadDigest: string;
}

export interface VendorAuthoringPlan {
  readonly contentWorkspace: VendorContentWorkspaceRef;
  readonly readToken: string;
  readonly expectedReadToken: string;
  readonly planDigest: string;
  readonly writes: readonly ContentWorkspaceWrite[];
  readonly changedPaths: readonly string[];
  readonly expectedReleaseInputBytes: Uint8Array;
  readonly expectedTransitions: readonly VendorExpectedTransition[];
}
