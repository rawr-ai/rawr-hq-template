import { Effect } from "effect";

import {
  MAX_PAYLOAD_BYTES_PER_MEMBER,
  MAX_PAYLOAD_ENTRIES_PER_MEMBER,
} from "../../../model/dto/agent-plugin-payload";
import { MAX_RELEASE_INPUT_ENVELOPE_BYTES } from "../../../model/dto/release-input";
import type { VendorSourceStatus } from "../model/dto/vendor-operations";
import {
  VENDOR_LOCK_PROTOCOL,
  VENDOR_PROVENANCE_PROTOCOL,
  VENDOR_SOURCE_PROTOCOL,
} from "../model/dto/vendor-records";
import type {
  VendorDeclaredSourceObservation,
  VendorDestinationObservation,
} from "../model/dto/vendor-workspace";
import {
  policyFailure,
  policySuccess,
  resourceFailureDetail,
  resourceFailureReason,
  type VendorPolicyResult,
  vendorIssue,
} from "../model/policy/vendor-policy-result";
import {
  decodeVendorLockRecord,
  decodeVendorProvenanceRecord,
  decodeVendorSourceDeclaration,
  type VendorRecordDecodeResult,
} from "../model/policy/vendor-record-codec";
import {
  createVendorUpstreamObservation,
  validateVendorRemote,
  vendorAncestryQuery,
  vendorRemoteQuery,
} from "../model/policy/vendor-source-observation";
import {
  classifyVendorSource,
  heldVendorSourceStatus,
  vendorStatusClassification,
  vendorStatusFromIssue,
  vendorUpstreamIssue,
} from "../model/policy/vendor-source-policy";
import {
  localVendorSourceIssue,
  vendorWorkspaceIssue,
} from "../model/policy/vendor-state-validation";
import {
  createVendorDeclaredSourceObservation,
  createVendorDestinationObservation,
  createVendorWorkspaceObservation,
  decodeVendorWorkspaceReleaseInput,
  vendorRecordBinding,
  vendorWorkspaceIdentityIssue,
} from "../model/policy/vendor-workspace-policy";
import { module } from "../module";

const MAX_VENDOR_RECORD_BYTES = 1024 * 1024;

/**
 * Observes declared vendor sources without materializing content or mutating
 * the content workspace.
 */
export const status = module.status.effect(function* ({ context, input: request }) {
  const readRecord = <T>(
    path: string,
    label: string,
    decode: (bytes: unknown) => VendorRecordDecodeResult<T>
  ): Effect.Effect<VendorPolicyResult<Readonly<{ value: T; contentDigest: string }>>> =>
    Effect.gen(function* () {
      const bytesAttempt = yield* Effect.result(
        context.contentWorkspace.readFile({
          root: request.contentWorkspace.locator,
          path,
          maxBytes: MAX_VENDOR_RECORD_BYTES,
        })
      );
      if (bytesAttempt._tag === "Failure") {
        const error = bytesAttempt.failure;
        return policyFailure(
          vendorIssue(
            resourceFailureReason(error) === "Missing" ? "PayloadMismatch" : "RuntimeFailure",
            `Vendor ${label} record could not be read at ${path}. ${resourceFailureDetail(error)}`
          )
        );
      }
      const decoded = decode(bytesAttempt.success);
      return decoded.ok
        ? policySuccess(
            Object.freeze({ value: decoded.value, contentDigest: decoded.contentDigest })
          )
        : policyFailure(
            vendorIssue(
              "PayloadMismatch",
              `Vendor ${label} record at ${path} is invalid: ${decoded.failure.detail}`
            )
          );
    });

  const observeDestination = (
    path: string,
    objectFormat: "sha1" | "sha256"
  ): Effect.Effect<VendorPolicyResult<VendorDestinationObservation>> =>
    Effect.gen(function* () {
      const entriesAttempt = yield* Effect.result(
        context.contentWorkspace.readTree({
          root: request.contentWorkspace.locator,
          path,
          objectFormat,
          maxEntries: MAX_PAYLOAD_ENTRIES_PER_MEMBER,
          maxBytes: MAX_PAYLOAD_BYTES_PER_MEMBER,
        })
      );
      if (entriesAttempt._tag === "Failure") {
        const error = entriesAttempt.failure;
        const reason = resourceFailureReason(error);
        if (reason === "Missing") return policySuccess(Object.freeze({ kind: "Missing" }));
        if (
          reason === "Aliased" ||
          reason === "UnsupportedEntry" ||
          reason === "LimitExceeded" ||
          reason === "InvalidInput"
        ) {
          return policySuccess(
            Object.freeze({ kind: "Invalid", detail: resourceFailureDetail(error) })
          );
        }
        return policyFailure(
          vendorIssue(
            "RuntimeFailure",
            `Vendor destination could not be read. ${resourceFailureDetail(error)}`
          )
        );
      }
      return policySuccess(createVendorDestinationObservation(entriesAttempt.success));
    });

  const identityAttempt = yield* Effect.result(
    context.contentWorkspace.inspectWorkspace({
      locator: request.contentWorkspace.locator,
    })
  );
  if (identityAttempt._tag === "Failure") {
    return {
      kind: "Rejected" as const,
      issues: [vendorIssue("RuntimeFailure", resourceFailureDetail(identityAttempt.failure))],
    };
  }
  const identity = identityAttempt.success;
  const identityIssue = vendorWorkspaceIdentityIssue(request.contentWorkspace, identity);
  if (identityIssue !== undefined) {
    return { kind: "Rejected" as const, issues: [identityIssue] };
  }
  const releaseInputAttempt = yield* Effect.result(
    context.contentWorkspace.readFile({
      root: request.contentWorkspace.locator,
      path: request.contentWorkspace.releaseInputPath,
      maxBytes: MAX_RELEASE_INPUT_ENVELOPE_BYTES,
    })
  );
  if (releaseInputAttempt._tag === "Failure") {
    const error = releaseInputAttempt.failure;
    return {
      kind: "Rejected" as const,
      issues: [
        vendorIssue(
          resourceFailureReason(error) === "Missing" ? "PayloadMismatch" : "RuntimeFailure",
          `Canonical release input could not be read. ${resourceFailureDetail(error)}`
        ),
      ],
    };
  }
  const releaseInput = decodeVendorWorkspaceReleaseInput(
    request.contentWorkspace,
    releaseInputAttempt.success
  );
  if (!releaseInput.ok) return { kind: "Rejected" as const, issues: releaseInput.issues };

  const sources: VendorDeclaredSourceObservation[] = [];
  for (const member of releaseInput.value.body.members) {
    for (const sourceBinding of member.vendor.filter(
      (binding) => binding.protocol === VENDOR_SOURCE_PROTOCOL
    )) {
      const declarationBinding = vendorRecordBinding(sourceBinding, VENDOR_SOURCE_PROTOCOL);
      if (declarationBinding === undefined) {
        return {
          kind: "Rejected" as const,
          issues: [
            vendorIssue(
              "PayloadMismatch",
              "Vendor declaration binding is not a canonical repository record binding."
            ),
          ],
        };
      }
      const declarationRead = yield* readRecord(
        declarationBinding.id,
        "declaration",
        decodeVendorSourceDeclaration
      );
      if (!declarationRead.ok) return { kind: "Rejected" as const, issues: declarationRead.issues };
      const declaration = declarationRead.value.value;
      const provenanceMatches = member.vendor.filter(
        (candidate) =>
          candidate.protocol === VENDOR_PROVENANCE_PROTOCOL &&
          candidate.id === declaration.provenancePath
      );
      const lockMatches = releaseInput.value.body.locks.filter(
        (candidate) =>
          candidate.protocol === VENDOR_LOCK_PROTOCOL && candidate.id === declaration.lockPath
      );
      const provenanceBinding =
        provenanceMatches.length === 1
          ? (vendorRecordBinding(provenanceMatches[0], VENDOR_PROVENANCE_PROTOCOL) ?? null)
          : null;
      const lockBinding =
        lockMatches.length === 1
          ? (vendorRecordBinding(lockMatches[0], VENDOR_LOCK_PROTOCOL) ?? null)
          : null;
      const provenanceRead =
        provenanceBinding === null
          ? null
          : yield* readRecord(provenanceBinding.id, "provenance", decodeVendorProvenanceRecord);
      if (provenanceRead !== null && !provenanceRead.ok) {
        return { kind: "Rejected" as const, issues: provenanceRead.issues };
      }
      const lockRead =
        lockBinding === null
          ? null
          : yield* readRecord(lockBinding.id, "lock", decodeVendorLockRecord);
      if (lockRead !== null && !lockRead.ok) {
        return { kind: "Rejected" as const, issues: lockRead.issues };
      }
      const destination = yield* observeDestination(
        declaration.destinationPath,
        identity.objectFormat
      );
      if (!destination.ok) return { kind: "Rejected" as const, issues: destination.issues };
      sources.push(
        createVendorDeclaredSourceObservation({
          memberPluginId: member.pluginId,
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
  }
  const workspace = createVendorWorkspaceObservation({
    requested: request.contentWorkspace,
    identity,
    releaseInput: releaseInput.value,
    releaseInputBytes: releaseInputAttempt.success,
    sources,
  });
  const workspaceIssue = vendorWorkspaceIssue(request, workspace);
  if (workspaceIssue !== undefined) {
    return { kind: "Rejected" as const, issues: [workspaceIssue] };
  }

  const statuses: VendorSourceStatus[] = [];
  for (const source of workspace.sources) {
    const localIssue = localVendorSourceIssue(source);
    if (localIssue !== undefined) {
      statuses.push(vendorStatusFromIssue(source, localIssue));
      continue;
    }
    if (source.declaration.policy === "held") {
      statuses.push(heldVendorSourceStatus(source));
      continue;
    }
    const remoteAttempt = yield* Effect.result(
      context.versionedContent.observeRemote(vendorRemoteQuery(source))
    );
    if (remoteAttempt._tag === "Failure") {
      const issue = vendorUpstreamIssue(remoteAttempt.failure, source.declaration.sourceId);
      statuses.push(vendorStatusFromIssue(source, issue, vendorStatusClassification(issue)));
      continue;
    }
    const validated = validateVendorRemote(source, remoteAttempt.success);
    if (!validated.ok) {
      const issue = validated.issues[0];
      statuses.push(vendorStatusFromIssue(source, issue, vendorStatusClassification(issue)));
      continue;
    }
    const ancestryQuery = vendorAncestryQuery(source, validated.value.identity);
    let isAncestor: boolean | null = null;
    if (ancestryQuery !== null) {
      const ancestryAttempt = yield* Effect.result(
        context.versionedContent.isAncestor(ancestryQuery)
      );
      if (ancestryAttempt._tag === "Failure") {
        const issue = vendorUpstreamIssue(ancestryAttempt.failure, source.declaration.sourceId);
        statuses.push(vendorStatusFromIssue(source, issue, vendorStatusClassification(issue)));
        continue;
      }
      isAncestor = ancestryAttempt.success;
    }
    const upstream = createVendorUpstreamObservation(
      validated.value.remote,
      validated.value.identity,
      isAncestor
    );
    statuses.push(classifyVendorSource(source, upstream).status);
  }
  return { kind: "VendorStatus" as const, sources: statuses };
});
