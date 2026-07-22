import type {
  ContentTreeEntry,
  ContentWorkspaceAsyncPort,
  ContentWorkspaceIdentity,
} from "@rawr/resource-content-workspace";

import {
  contentDigest,
  decodeAgentPluginReleaseInput,
  MAX_PAYLOAD_BYTES_PER_MEMBER,
  MAX_PAYLOAD_ENTRIES_PER_MEMBER,
  MAX_RELEASE_INPUT_ENVELOPE_BYTES,
  type ProvenanceBinding,
} from "../../../../shared/release";
import type { VendorContentWorkspaceRef } from "../dto/vendor-operations";
import type { VendorRecordBinding } from "../dto/vendor-records";
import {
  GIT_OBJECT_ID_PATTERN,
  NORMALIZED_RELATIVE_PATH_PATTERN,
  VENDOR_LOCK_PROTOCOL,
  VENDOR_PROVENANCE_PROTOCOL,
  VENDOR_SOURCE_PROTOCOL,
} from "../dto/vendor-records";
import type {
  VendorDeclaredSourceObservation,
  VendorDestinationObservation,
  VendorWorkspaceObservation,
} from "../dto/vendor-workspace";
import { validGitObjectForFormat, vendorPayloadLayoutIssue } from "./vendor-payload-policy";
import {
  policyFailure,
  policySuccess,
  resourceFailureDetail,
  resourceFailureReason,
  type VendorPolicyResult,
  vendorIssue,
} from "./vendor-policy-result";
import {
  decodeVendorLockRecord,
  decodeVendorProvenanceRecord,
  decodeVendorSourceDeclaration,
  type VendorRecordDecodeResult,
  vendorPayloadDigest,
} from "./vendor-record-codec";
import { vendorWorkspaceReadToken } from "./vendor-workspace-token";

const normalizedRelativePath = new RegExp(NORMALIZED_RELATIVE_PATH_PATTERN, "u");
const gitObjectId = new RegExp(GIT_OBJECT_ID_PATTERN, "u");
const MAX_VENDOR_RECORD_BYTES = 1024 * 1024;

export async function observeVendorWorkspace(
  port: ContentWorkspaceAsyncPort,
  requested: VendorContentWorkspaceRef
): Promise<VendorPolicyResult<VendorWorkspaceObservation>> {
  let identity: ContentWorkspaceIdentity;
  try {
    identity = await port.inspectWorkspace({ locator: requested.locator });
  } catch (error) {
    return policyFailure(vendorIssue("RuntimeFailure", resourceFailureDetail("inspect", error)));
  }
  const identityFailure = workspaceIdentityIssue(requested, identity);
  if (identityFailure !== undefined) return policyFailure(identityFailure);

  let releaseInputBytes: Uint8Array;
  try {
    releaseInputBytes = await port.readFile({
      root: requested.locator,
      path: requested.releaseInputPath,
      maxBytes: MAX_RELEASE_INPUT_ENVELOPE_BYTES,
    });
  } catch (error) {
    return policyFailure(
      vendorIssue(
        resourceFailureReason(error) === "Missing" ? "PayloadMismatch" : "RuntimeFailure",
        `Canonical release input could not be read. ${resourceFailureDetail("read-file", error)}`
      )
    );
  }
  const decodedInput = decodeAgentPluginReleaseInput(releaseInputBytes);
  if (!decodedInput.ok) {
    return policyFailure(
      vendorIssue(
        "PayloadMismatch",
        `Canonical release input is invalid: ${decodedInput.issues.map((entry) => entry.message).join("; ")}`
      )
    );
  }
  if (decodedInput.value.body.contentAuthority !== requested.contentAuthority) {
    return policyFailure(
      vendorIssue("WrongRepository", "Release input declares a different content authority.")
    );
  }

  const sources: VendorDeclaredSourceObservation[] = [];
  for (const member of decodedInput.value.body.members) {
    for (const sourceBinding of member.vendor.filter(
      (binding) => binding.protocol === VENDOR_SOURCE_PROTOCOL
    )) {
      const observed = await observeDeclaredSource(
        port,
        requested.locator,
        identity,
        decodedInput.value.body.locks,
        member.pluginId,
        member.vendor,
        sourceBinding
      );
      if (!observed.ok) return observed;
      sources.push(observed.value);
    }
  }
  sources.sort((left, right) => compareText(left.declaration.sourceId, right.declaration.sourceId));
  const releaseBytes = new Uint8Array(releaseInputBytes);
  const releaseInputContentDigest = contentDigest(releaseBytes);
  const contentWorkspace = Object.freeze({
    repositoryIdentity: requested.repositoryIdentity,
    contentAuthority: requested.contentAuthority,
    refName: identity.refName,
    sourceCommit: identity.commit,
    sourceTree: identity.tree,
    releaseInputPath: requested.releaseInputPath,
  });
  const frozenSources = Object.freeze(sources);
  return policySuccess(
    Object.freeze({
      contentWorkspace,
      workspaceIdentity: freezeIdentity(identity),
      releaseInput: decodedInput.value,
      releaseInputBytes: releaseBytes,
      releaseInputContentDigest,
      readToken: vendorWorkspaceReadToken({
        workspaceIdentity: identity,
        contentAuthority: requested.contentAuthority,
        releaseInputPath: requested.releaseInputPath,
        releaseInputContentDigest,
        sources: frozenSources,
      }),
      sources: frozenSources,
    })
  );
}

async function observeDeclaredSource(
  port: ContentWorkspaceAsyncPort,
  root: string,
  identity: ContentWorkspaceIdentity,
  locks: readonly ProvenanceBinding[],
  memberPluginId: string,
  vendorBindings: readonly ProvenanceBinding[],
  sourceBindingInput: ProvenanceBinding
): Promise<VendorPolicyResult<VendorDeclaredSourceObservation>> {
  const declarationBinding = recordBinding(sourceBindingInput, VENDOR_SOURCE_PROTOCOL);
  if (declarationBinding === undefined) {
    return policyFailure(
      vendorIssue(
        "PayloadMismatch",
        "Vendor declaration binding is not a canonical repository record binding."
      )
    );
  }
  const declarationRead = await readRecord(
    port,
    root,
    declarationBinding.id,
    "declaration",
    decodeVendorSourceDeclaration
  );
  if (!declarationRead.ok) return declarationRead;
  const declaration = declarationRead.value.value;

  const provenanceMatches = vendorBindings.filter(
    (candidate) =>
      candidate.protocol === VENDOR_PROVENANCE_PROTOCOL &&
      candidate.id === declaration.provenancePath
  );
  const lockMatches = locks.filter(
    (candidate) =>
      candidate.protocol === VENDOR_LOCK_PROTOCOL && candidate.id === declaration.lockPath
  );
  const provenanceBinding =
    provenanceMatches.length === 1
      ? (recordBinding(provenanceMatches[0], VENDOR_PROVENANCE_PROTOCOL) ?? null)
      : null;
  const lockBinding =
    lockMatches.length === 1 ? (recordBinding(lockMatches[0], VENDOR_LOCK_PROTOCOL) ?? null) : null;
  const provenanceRead =
    provenanceBinding === null
      ? null
      : await readRecord(
          port,
          root,
          provenanceBinding.id,
          "provenance",
          decodeVendorProvenanceRecord
        );
  if (provenanceRead !== null && !provenanceRead.ok) return provenanceRead;
  const lockRead =
    lockBinding === null
      ? null
      : await readRecord(port, root, lockBinding.id, "lock", decodeVendorLockRecord);
  if (lockRead !== null && !lockRead.ok) return lockRead;
  const destination = await observeDestination(port, root, identity, declaration.destinationPath);
  if (!destination.ok) return destination;

  return policySuccess(
    Object.freeze({
      memberPluginId,
      declarationBinding,
      declarationContentDigest: declarationRead.value.contentDigest,
      declaration,
      provenanceBinding,
      provenanceContentDigest: provenanceRead?.value.contentDigest ?? null,
      provenance: provenanceRead?.value.value ?? null,
      lockBinding,
      lockContentDigest: lockRead?.value.contentDigest ?? null,
      lock: lockRead?.value.value ?? null,
      destination: destination.value,
    })
  );
}

async function observeDestination(
  port: ContentWorkspaceAsyncPort,
  root: string,
  identity: ContentWorkspaceIdentity,
  destinationPath: string
): Promise<VendorPolicyResult<VendorDestinationObservation>> {
  let entries: readonly ContentTreeEntry[];
  try {
    entries = await port.readTree({
      root,
      path: destinationPath,
      objectFormat: identity.objectFormat,
      maxEntries: MAX_PAYLOAD_ENTRIES_PER_MEMBER,
      maxBytes: MAX_PAYLOAD_BYTES_PER_MEMBER,
    });
  } catch (error) {
    const reason = resourceFailureReason(error);
    if (reason === "Missing") return policySuccess(Object.freeze({ kind: "Missing" }));
    if (
      reason === "Aliased" ||
      reason === "UnsupportedEntry" ||
      reason === "LimitExceeded" ||
      reason === "InvalidInput"
    ) {
      return policySuccess(
        Object.freeze({ kind: "Invalid", detail: resourceFailureDetail("read-tree", error) })
      );
    }
    return policyFailure(
      vendorIssue(
        "RuntimeFailure",
        `Vendor destination could not be read. ${resourceFailureDetail("read-tree", error)}`
      )
    );
  }
  const layoutIssue = vendorPayloadLayoutIssue(entries, identity.objectFormat);
  if (layoutIssue !== undefined)
    return policySuccess(Object.freeze({ kind: "Invalid", detail: layoutIssue }));
  const cloned = cloneTreeEntries(entries);
  return policySuccess(
    Object.freeze({
      kind: "Present",
      entries: cloned,
      payloadDigest: vendorPayloadDigest(cloned),
    })
  );
}

async function readRecord<T>(
  port: ContentWorkspaceAsyncPort,
  root: string,
  path: string,
  label: string,
  decode: (bytes: unknown) => VendorRecordDecodeResult<T>
): Promise<VendorPolicyResult<Readonly<{ value: T; contentDigest: string }>>> {
  let bytes: Uint8Array;
  try {
    bytes = await port.readFile({ root, path, maxBytes: MAX_VENDOR_RECORD_BYTES });
  } catch (error) {
    return policyFailure(
      vendorIssue(
        resourceFailureReason(error) === "Missing" ? "PayloadMismatch" : "RuntimeFailure",
        `Vendor ${label} record could not be read at ${path}. ${resourceFailureDetail("read-file", error)}`
      )
    );
  }
  const decoded = decode(bytes);
  return decoded.ok
    ? policySuccess(Object.freeze({ value: decoded.value, contentDigest: decoded.contentDigest }))
    : policyFailure(
        vendorIssue(
          "PayloadMismatch",
          `Vendor ${label} record at ${path} is invalid: ${decoded.failure.detail}`
        )
      );
}

function workspaceIdentityIssue(
  requested: VendorContentWorkspaceRef,
  actual: ContentWorkspaceIdentity
) {
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
  if (
    !gitObjectId.test(actual.commit) ||
    !gitObjectId.test(actual.tree) ||
    !validGitObjectForFormat(actual.commit, actual.objectFormat) ||
    !validGitObjectForFormat(actual.tree, actual.objectFormat)
  ) {
    return vendorIssue("RuntimeFailure", "Content workspace returned an invalid Git identity.");
  }
  if (actual.commit !== requested.sourceCommit || actual.tree !== requested.sourceTree) {
    return vendorIssue(
      "LocalDrift",
      "Content workspace commit or tree differs from the requested immutable identity."
    );
  }
  return undefined;
}

function recordBinding(
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
