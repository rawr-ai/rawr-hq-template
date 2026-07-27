import type { ContentTreeEntry, ContentWorkspaceIdentity } from "@rawr/resource-content-workspace";
import type { ProvenanceBinding } from "#agent-plugin-lifecycle-service/model/dto/release-input";

import { contentDigest, decodeAgentPluginReleaseInput } from "../../../../shared/release";
import type { VendorContentWorkspaceRef, VendorUpdateIssue } from "../dto/vendor-operations";
import type {
  VendorLockRecord,
  VendorProvenanceRecord,
  VendorRecordBinding,
  VendorSourceDeclaration,
} from "../dto/vendor-records";
import { NORMALIZED_RELATIVE_PATH_PATTERN } from "../dto/vendor-records";
import type {
  VendorDeclaredSourceObservation,
  VendorDestinationObservation,
  VendorWorkspaceObservation,
} from "../dto/vendor-workspace";
import { vendorPayloadLayoutIssue } from "./vendor-payload-policy";
import {
  policyFailure,
  policySuccess,
  type VendorPolicyResult,
  vendorIssue,
} from "./vendor-policy-result";
import { vendorPayloadDigest } from "./vendor-record-codec";
import { vendorWorkspaceReadToken } from "./vendor-workspace-token";

const normalizedRelativePath = new RegExp(NORMALIZED_RELATIVE_PATH_PATTERN, "u");

/** Validates the provider-reported identity against the requested content workspace. */
export function vendorWorkspaceIdentityIssue(
  requested: VendorContentWorkspaceRef,
  actual: ContentWorkspaceIdentity
): VendorUpdateIssue | undefined {
  if (actual.root !== requested.locator) {
    return vendorIssue(
      "RuntimeFailure",
      "Content workspace identity returned a different canonical root."
    );
  }
  if (!actual.remoteUrls.includes(requested.repositoryIdentity)) {
    return vendorIssue(
      "WrongRepository",
      "Content workspace has no exact remote matching the requested repository identity."
    );
  }
  if (actual.refName !== requested.refName) {
    return vendorIssue("WrongRef", "Content workspace is on a different qualified ref.");
  }
  if (actual.commit !== requested.sourceCommit || actual.tree !== requested.sourceTree) {
    return vendorIssue(
      "LocalDrift",
      "Content workspace commit or tree differs from the requested immutable identity."
    );
  }
  return undefined;
}

/** Decodes and validates the release input that declares Vendor source bindings. */
export function decodeVendorWorkspaceReleaseInput(
  requested: VendorContentWorkspaceRef,
  releaseInputBytes: Uint8Array
) {
  const decoded = decodeAgentPluginReleaseInput(releaseInputBytes);
  if (!decoded.ok) {
    return policyFailure(
      vendorIssue(
        "PayloadMismatch",
        `Canonical release input is invalid: ${decoded.issues
          .map((entry) => entry.message)
          .join("; ")}`
      )
    );
  }
  if (decoded.value.body.contentAuthority !== requested.contentAuthority) {
    return policyFailure(
      vendorIssue("WrongRepository", "Release input declares a different content authority.")
    );
  }
  return policySuccess(decoded.value);
}

/** Narrows a generic provenance binding to one canonical Vendor record binding. */
export function vendorRecordBinding(
  input: ProvenanceBinding | undefined,
  protocol: VendorRecordBinding["protocol"]
): VendorRecordBinding | undefined {
  if (
    input === undefined ||
    input.protocol !== protocol ||
    !normalizedRelativePath.test(input.id) ||
    !/^sha256_[0-9a-f]{64}$/u.test(input.contentDigest)
  ) {
    return undefined;
  }
  return Object.freeze({ id: input.id, protocol, contentDigest: input.contentDigest });
}

/** Interprets exact destination-tree facts as Vendor destination state. */
export function createVendorDestinationObservation(
  entries: readonly ContentTreeEntry[]
): VendorDestinationObservation {
  const layoutIssue = vendorPayloadLayoutIssue(entries);
  if (layoutIssue !== undefined) {
    return Object.freeze({ kind: "Invalid", detail: layoutIssue });
  }
  const cloned = cloneTreeEntries(entries);
  return Object.freeze({
    kind: "Present",
    entries: cloned,
    payloadDigest: vendorPayloadDigest(cloned),
  });
}

/** Assembles one declared source from already decoded records and destination facts. */
export function createVendorDeclaredSourceObservation(input: {
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
}): VendorDeclaredSourceObservation {
  return Object.freeze({ ...input });
}

/** Constructs the complete immutable workspace observation and semantic read token. */
export function createVendorWorkspaceObservation(input: {
  readonly requested: VendorContentWorkspaceRef;
  readonly identity: ContentWorkspaceIdentity;
  readonly releaseInput: VendorWorkspaceObservation["releaseInput"];
  readonly releaseInputBytes: Uint8Array;
  readonly sources: readonly VendorDeclaredSourceObservation[];
}): VendorWorkspaceObservation {
  const releaseBytes = new Uint8Array(input.releaseInputBytes);
  const releaseInputContentDigest = contentDigest(releaseBytes);
  const sources = Object.freeze(
    [...input.sources].sort((left, right) =>
      compareText(left.declaration.sourceId, right.declaration.sourceId)
    )
  );
  return Object.freeze({
    contentWorkspace: Object.freeze({
      repositoryIdentity: input.requested.repositoryIdentity,
      contentAuthority: input.requested.contentAuthority,
      refName: input.identity.refName,
      sourceCommit: input.identity.commit,
      sourceTree: input.identity.tree,
      releaseInputPath: input.requested.releaseInputPath,
    }),
    workspaceIdentity: freezeIdentity(input.identity),
    releaseInput: input.releaseInput,
    releaseInputBytes: releaseBytes,
    releaseInputContentDigest,
    readToken: vendorWorkspaceReadToken({
      workspaceIdentity: input.identity,
      contentAuthority: input.requested.contentAuthority,
      releaseInputPath: input.requested.releaseInputPath,
      releaseInputContentDigest,
      sources,
    }),
    sources,
  });
}

function freezeIdentity(identity: ContentWorkspaceIdentity): ContentWorkspaceIdentity {
  return Object.freeze({
    root: identity.root,
    refName: identity.refName,
    commit: identity.commit,
    tree: identity.tree,
    objectFormat: identity.objectFormat,
    remoteUrls: Object.freeze([...identity.remoteUrls]),
  });
}

function cloneTreeEntries(entries: readonly ContentTreeEntry[]): readonly ContentTreeEntry[] {
  return Object.freeze(
    entries.map((entry) =>
      Object.freeze({
        path: entry.path,
        mode: entry.mode,
        blob: entry.blob,
      })
    )
  );
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
