import type { ContentWorkspaceIdentity } from "@rawr/resource-content-workspace";

import { canonicalJsonLine, type CanonicalJsonValue } from "../../../../shared/release/canonical";
import { contentDigest } from "../../../../shared/release/primitives";
import type {
  VendorDeclaredSourceObservation,
  VendorDestinationObservation,
} from "../dto/vendor-workspace";

export interface VendorWorkspaceTokenInput {
  readonly workspaceIdentity: ContentWorkspaceIdentity;
  readonly contentAuthority: string;
  readonly releaseInputPath: string;
  readonly releaseInputContentDigest: string;
  readonly sources: readonly VendorDeclaredSourceObservation[];
}

export function vendorWorkspaceReadToken(input: VendorWorkspaceTokenInput): string {
  return contentDigest(
    canonicalJsonLine({
      contentAuthority: input.contentAuthority,
      releaseInputContentDigest: input.releaseInputContentDigest,
      releaseInputPath: input.releaseInputPath,
      sources: [...input.sources]
        .sort((left, right) => compareText(left.declaration.sourceId, right.declaration.sourceId))
        .map(sourceTokenValue),
      workspace: {
        commit: input.workspaceIdentity.commit,
        objectFormat: input.workspaceIdentity.objectFormat,
        refName: input.workspaceIdentity.refName,
        remoteUrls: [...input.workspaceIdentity.remoteUrls].sort(compareText),
        root: input.workspaceIdentity.root,
        tree: input.workspaceIdentity.tree,
      },
    })
  );
}

function sourceTokenValue(source: VendorDeclaredSourceObservation): CanonicalJsonValue {
  return {
    declarationContentDigest: source.declarationContentDigest,
    destination: destinationTokenValue(source.destination),
    lockContentDigest: source.lockContentDigest,
    memberPluginId: source.memberPluginId,
    provenanceContentDigest: source.provenanceContentDigest,
    sourceId: source.declaration.sourceId,
  };
}

function destinationTokenValue(destination: VendorDestinationObservation): CanonicalJsonValue {
  switch (destination.kind) {
    case "Present":
      return { kind: destination.kind, payloadDigest: destination.payloadDigest };
    case "Missing":
      return { kind: destination.kind };
    case "Invalid":
      return { detail: destination.detail, kind: destination.kind };
  }
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
