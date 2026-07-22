import type {
  ContentWorkspaceWrite,
  MaterializedContentTreeEntry,
} from "@rawr/resource-content-workspace";

import {
  canonicalSerializeAgentPluginReleaseInput,
  contentDigest,
  createAgentPluginReleaseInput,
} from "../../../../shared/release";
import { type CanonicalJsonValue, canonicalJsonLine } from "../../../../shared/release/canonical";
import type { VendorContentWorkspaceRef } from "../dto/vendor-operations";
import {
  VENDOR_LOCK_PROTOCOL,
  VENDOR_PROVENANCE_PROTOCOL,
  VENDOR_SOURCE_PROTOCOL,
  type VendorLockRecord,
  type VendorProvenanceRecord,
  type VendorRecordBinding,
  type VendorSourceDeclaration,
} from "../dto/vendor-records";
import type {
  VendorAuthoringPlan,
  VendorDeclaredSourceObservation,
  VendorExpectedTransition,
  VendorPreparedPayload,
  VendorSourceChange,
  VendorWorkspaceObservation,
} from "../dto/vendor-workspace";
import {
  policyFailure,
  policySuccess,
  type VendorPolicyResult,
  vendorIssue,
} from "./vendor-policy-result";
import {
  encodeVendorLockRecord,
  encodeVendorProvenanceRecord,
  encodeVendorSourceDeclaration,
} from "./vendor-record-codec";
import { vendorWorkspaceReadToken } from "./vendor-workspace-token";

export function createVendorSourceChange(
  source: VendorDeclaredSourceObservation,
  payload: VendorPreparedPayload
): VendorPolicyResult<VendorSourceChange> {
  if (
    source.provenance === null ||
    source.provenanceBinding === null ||
    source.lock === null ||
    source.lockBinding === null
  ) {
    return policyFailure(
      vendorIssue(
        "PayloadMismatch",
        "Validated vendor provenance or lock state became unavailable.",
        source.declaration.sourceId
      )
    );
  }
  if (source.declaration.curationRevision >= Number.MAX_SAFE_INTEGER) {
    return policyFailure(
      vendorIssue(
        "PayloadMismatch",
        "Vendor curation revision cannot advance beyond the safe integer bound.",
        source.declaration.sourceId
      )
    );
  }
  const nextDeclaration: VendorSourceDeclaration = Object.freeze({
    ...source.declaration,
    curationRevision: source.declaration.curationRevision + 1,
  });
  const nextProvenance: VendorProvenanceRecord = Object.freeze({
    schemaVersion: 1,
    sourceId: source.declaration.sourceId,
    admitted: payload.identity,
    importedPayloadDigest: payload.identity.payloadDigest,
    curationRevision: nextDeclaration.curationRevision,
    supportedBaseline: nextDeclaration.supportedBaseline,
    observedLatest: payload.identity,
    observedAt: payload.observedAt,
    disposition: "review-required",
  });
  const nextLock: VendorLockRecord = Object.freeze({
    schemaVersion: 1,
    sourceId: source.declaration.sourceId,
    admitted: payload.identity,
  });
  return policySuccess(
    Object.freeze({
      sourceId: source.declaration.sourceId,
      prior: source.lock.admitted,
      next: payload.identity,
      memberPluginId: source.memberPluginId,
      declarationBinding: source.declarationBinding,
      provenanceBinding: source.provenanceBinding,
      lockBinding: source.lockBinding,
      nextRecords: Object.freeze({
        declaration: nextDeclaration,
        provenance: nextProvenance,
        lock: nextLock,
      }),
      payload,
      declarationPath: source.declarationBinding.id,
      destinationPath: source.declaration.destinationPath,
      provenancePath: source.declaration.provenancePath,
      lockPath: source.declaration.lockPath,
    })
  );
}

export function createVendorAuthoringPlan(
  contentWorkspace: VendorContentWorkspaceRef,
  observation: VendorWorkspaceObservation,
  changesInput: readonly VendorSourceChange[]
): VendorPolicyResult<VendorAuthoringPlan> {
  const changes = [...changesInput].sort((left, right) =>
    compareText(left.sourceId, right.sourceId)
  );
  const bindingDigests = new Map<string, string>();
  const transitions: VendorExpectedTransition[] = [];
  const treeWrites: ContentWorkspaceWrite[] = [];
  const recordWrites: ContentWorkspaceWrite[] = [];

  for (const change of changes) {
    const declarationBytes = encodeVendorSourceDeclaration(change.nextRecords.declaration);
    const provenanceBytes = encodeVendorProvenanceRecord(change.nextRecords.provenance);
    const lockBytes = encodeVendorLockRecord(change.nextRecords.lock);
    const declarationContentDigest = contentDigest(declarationBytes);
    const provenanceContentDigest = contentDigest(provenanceBytes);
    const lockContentDigest = contentDigest(lockBytes);
    const declarationBinding = withContentDigest(
      change.declarationBinding,
      declarationContentDigest
    );
    const provenanceBinding = withContentDigest(change.provenanceBinding, provenanceContentDigest);
    const lockBinding = withContentDigest(change.lockBinding, lockContentDigest);
    bindingDigests.set(
      bindingKey(change.memberPluginId, declarationBinding),
      declarationContentDigest
    );
    bindingDigests.set(
      bindingKey(change.memberPluginId, provenanceBinding),
      provenanceContentDigest
    );
    bindingDigests.set(bindingKey("@locks", lockBinding), lockContentDigest);
    treeWrites.push(
      Object.freeze({
        kind: "ReplaceTree",
        path: change.destinationPath,
        entries: cloneEntries(change.payload.entries),
      })
    );
    recordWrites.push(
      fileWrite(change.declarationPath, declarationBytes),
      fileWrite(change.provenancePath, provenanceBytes),
      fileWrite(change.lockPath, lockBytes)
    );
    transitions.push(
      Object.freeze({
        sourceId: change.sourceId,
        memberPluginId: change.memberPluginId,
        declarationBinding,
        declarationContentDigest,
        declaration: change.nextRecords.declaration,
        provenanceBinding,
        provenanceContentDigest,
        provenance: change.nextRecords.provenance,
        lockBinding,
        lockContentDigest,
        lock: change.nextRecords.lock,
        destinationPayloadDigest: change.next.payloadDigest,
      })
    );
  }

  const rewritten = rewriteReleaseInput(observation, bindingDigests);
  if (!rewritten.ok) return rewritten;
  const releaseInputBytes = canonicalSerializeAgentPluginReleaseInput(rewritten.value);
  const writes = Object.freeze([
    ...treeWrites.sort(compareWritePath),
    ...recordWrites.sort(compareWritePath),
    fileWrite(observation.contentWorkspace.releaseInputPath, releaseInputBytes),
  ]);
  const writeSetIssue = validateWriteSet(writes);
  if (writeSetIssue !== undefined)
    return policyFailure(vendorIssue("UnsupportedLayout", writeSetIssue));
  const changedPaths = Object.freeze(writes.map((write) => write.path).sort(compareText));
  const expectedSources = expectedSourceObservations(observation.sources, changes, transitions);
  const expectedReadToken = vendorWorkspaceReadToken({
    workspaceIdentity: observation.workspaceIdentity,
    contentAuthority: observation.contentWorkspace.contentAuthority,
    releaseInputPath: observation.contentWorkspace.releaseInputPath,
    releaseInputContentDigest: contentDigest(releaseInputBytes),
    sources: expectedSources,
  });
  const planDigest = contentDigest(
    canonicalJsonLine({
      expectedReadToken,
      readToken: observation.readToken,
      writes: writes.map(writeDigestValue),
      workspace: {
        contentAuthority: contentWorkspace.contentAuthority,
        locator: contentWorkspace.locator,
        objectFormat: observation.workspaceIdentity.objectFormat,
        repositoryIdentity: contentWorkspace.repositoryIdentity,
        sourceCommit: contentWorkspace.sourceCommit,
        sourceTree: contentWorkspace.sourceTree,
      },
    })
  );
  return policySuccess(
    Object.freeze({
      contentWorkspace: Object.freeze({ ...contentWorkspace }),
      readToken: observation.readToken,
      expectedReadToken,
      planDigest,
      writes,
      changedPaths,
      expectedReleaseInputBytes: new Uint8Array(releaseInputBytes),
      expectedTransitions: Object.freeze(transitions),
    })
  );
}

function rewriteReleaseInput(
  observation: VendorWorkspaceObservation,
  bindingDigests: ReadonlyMap<string, string>
) {
  const body = observation.releaseInput.body;
  const created = createAgentPluginReleaseInput({
    ...body,
    members: body.members.map((member) => ({
      ...member,
      vendor: member.vendor.map((binding) => ({
        ...binding,
        contentDigest:
          bindingDigests.get(bindingKey(member.pluginId, binding)) ?? binding.contentDigest,
      })),
    })),
    locks: body.locks.map((binding) => ({
      ...binding,
      contentDigest: bindingDigests.get(bindingKey("@locks", binding)) ?? binding.contentDigest,
    })),
  });
  return created.ok
    ? policySuccess(created.value)
    : policyFailure(
        vendorIssue(
          "PayloadMismatch",
          `Vendor release-input rewrite is invalid: ${created.issues.map((entry) => entry.message).join("; ")}`
        )
      );
}

function expectedSourceObservations(
  sources: readonly VendorDeclaredSourceObservation[],
  changes: readonly VendorSourceChange[],
  transitions: readonly VendorExpectedTransition[]
): readonly VendorDeclaredSourceObservation[] {
  const changeById = new Map(changes.map((change) => [change.sourceId, change]));
  const transitionById = new Map(
    transitions.map((transition) => [transition.sourceId, transition])
  );
  return Object.freeze(
    sources.map((source) => {
      const change = changeById.get(source.declaration.sourceId);
      const transition = transitionById.get(source.declaration.sourceId);
      if (change === undefined || transition === undefined) return source;
      return Object.freeze({
        memberPluginId: transition.memberPluginId,
        declarationBinding: transition.declarationBinding,
        declarationContentDigest: transition.declarationContentDigest,
        declaration: transition.declaration,
        provenanceBinding: transition.provenanceBinding,
        provenanceContentDigest: transition.provenanceContentDigest,
        provenance: transition.provenance,
        lockBinding: transition.lockBinding,
        lockContentDigest: transition.lockContentDigest,
        lock: transition.lock,
        destination: Object.freeze({
          kind: "Present",
          entries: change.payload.entries.map(({ path, mode, blob }) =>
            Object.freeze({ path, mode, blob })
          ),
          payloadDigest: transition.destinationPayloadDigest,
        }),
      });
    })
  );
}

function fileWrite(path: string, bytes: Uint8Array): ContentWorkspaceWrite {
  return Object.freeze({
    kind: "ReplaceFile",
    path,
    mode: "100644",
    bytes: new Uint8Array(bytes),
  });
}

function cloneEntries(
  entries: readonly MaterializedContentTreeEntry[]
): readonly MaterializedContentTreeEntry[] {
  return Object.freeze(
    entries.map((entry) =>
      Object.freeze({
        path: entry.path,
        mode: entry.mode,
        blob: entry.blob,
        bytes: new Uint8Array(entry.bytes),
      })
    )
  );
}

function withContentDigest(binding: VendorRecordBinding, digest: string): VendorRecordBinding {
  return Object.freeze({ id: binding.id, protocol: binding.protocol, contentDigest: digest });
}

function bindingKey(owner: string, binding: Readonly<{ id: string; protocol: string }>): string {
  return `${owner}\0${binding.protocol}\0${binding.id}`;
}

function validateWriteSet(writes: readonly ContentWorkspaceWrite[]): string | undefined {
  const paths: string[] = [];
  for (const write of writes) {
    if (paths.some((path) => pathsOverlap(path, write.path))) {
      return `Vendor authoring paths overlap or repeat at ${write.path}.`;
    }
    paths.push(write.path);
  }
  return undefined;
}

function pathsOverlap(left: string, right: string): boolean {
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

function writeDigestValue(write: ContentWorkspaceWrite): CanonicalJsonValue {
  if (write.kind === "ReplaceFile") {
    return {
      contentDigest: contentDigest(write.bytes),
      kind: write.kind,
      mode: write.mode,
      path: write.path,
    };
  }
  return {
    entries: write.entries.map((entry) => ({
      blob: entry.blob,
      contentDigest: contentDigest(entry.bytes),
      mode: entry.mode,
      path: entry.path,
    })),
    kind: write.kind,
    path: write.path,
  };
}

function compareWritePath(left: ContentWorkspaceWrite, right: ContentWorkspaceWrite): number {
  return compareText(left.path, right.path);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
