import type { ContentWorkspaceCapture } from "@habitat-ai/rawr-resource-content-workspace";
import { Effect } from "effect";

import {
  MAX_PAYLOAD_BYTES_PER_MEMBER,
  MAX_PAYLOAD_ENTRIES_PER_MEMBER,
} from "#agent-plugin-lifecycle-service/model/dto/agent-plugin-payload";
import { MAX_RELEASE_INPUT_ENVELOPE_BYTES } from "#agent-plugin-lifecycle-service/model/dto/release-input";
import type { VendorUpdateIssue, VendorUpdateResult } from "../model/dto/vendor-operations";
import {
  VENDOR_LOCK_PROTOCOL,
  VENDOR_PROVENANCE_PROTOCOL,
  VENDOR_SOURCE_PROTOCOL,
} from "../model/dto/vendor-records";
import type {
  VendorDeclaredSourceObservation,
  VendorDestinationObservation,
  VendorSourceChange,
  VendorUpstreamObservation,
} from "../model/dto/vendor-workspace";
import {
  createVendorAuthoringPlan,
  createVendorSourceChange,
} from "../model/policy/vendor-authoring-plan";
import { createVendorPreparedPayload } from "../model/policy/vendor-payload-policy";
import {
  nonEmptyVendorIssues,
  policyFailure,
  policySuccess,
  resourceFailureDetail,
  resourceFailureReason,
  type VendorPolicyResult,
  vendorIssue,
} from "../model/policy/vendor-policy-result";
import {
  validVendorApplyReceipt,
  validVendorCapture,
  validVendorReleaseReceipt,
  validVendorRestoreReceipt,
  validVendorSettlementReceipt,
} from "../model/policy/vendor-receipt-policy";
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
  vendorMaterializationQuery,
  vendorRemoteQuery,
} from "../model/policy/vendor-source-observation";
import {
  classifyVendorSource,
  selectVendorSources,
  vendorUpstreamIssue,
} from "../model/policy/vendor-source-policy";
import { vendorPlanIsApplied, vendorWorkspaceIssue } from "../model/policy/vendor-state-validation";
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
const MAX_CAPTURE_ENTRIES = 200_000;
const MAX_CAPTURE_BYTES = 512 * 1024 * 1024;

/**
 * Authors selected fast-forward vendor updates through one captured and
 * revalidated content-workspace transition.
 */
export const update = module.update.effect(function* ({ context, input: request }) {
  const rejected = (
    issues: readonly [VendorUpdateIssue, ...VendorUpdateIssue[]]
  ): VendorUpdateResult => ({ kind: "Rejected", sourceIds: request.sourceIds, issues });

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

  const observeWorkspace = Effect.gen(function* () {
    const identityAttempt = yield* Effect.result(
      context.contentWorkspace.inspectWorkspace({
        locator: request.contentWorkspace.locator,
      })
    );
    if (identityAttempt._tag === "Failure") {
      return policyFailure(
        vendorIssue("RuntimeFailure", resourceFailureDetail(identityAttempt.failure))
      );
    }
    const identity = identityAttempt.success;
    const identityIssue = vendorWorkspaceIdentityIssue(request.contentWorkspace, identity);
    if (identityIssue !== undefined) return policyFailure(identityIssue);
    const releaseInputAttempt = yield* Effect.result(
      context.contentWorkspace.readFile({
        root: request.contentWorkspace.locator,
        path: request.contentWorkspace.releaseInputPath,
        maxBytes: MAX_RELEASE_INPUT_ENVELOPE_BYTES,
      })
    );
    if (releaseInputAttempt._tag === "Failure") {
      const error = releaseInputAttempt.failure;
      return policyFailure(
        vendorIssue(
          resourceFailureReason(error) === "Missing" ? "PayloadMismatch" : "RuntimeFailure",
          `Canonical release input could not be read. ${resourceFailureDetail(error)}`
        )
      );
    }
    const releaseInput = decodeVendorWorkspaceReleaseInput(
      request.contentWorkspace,
      releaseInputAttempt.success
    );
    if (!releaseInput.ok) return releaseInput;

    const sources: VendorDeclaredSourceObservation[] = [];
    for (const member of releaseInput.value.body.members) {
      for (const sourceBinding of member.vendor.filter(
        (binding) => binding.protocol === VENDOR_SOURCE_PROTOCOL
      )) {
        const declarationBinding = vendorRecordBinding(sourceBinding, VENDOR_SOURCE_PROTOCOL);
        if (declarationBinding === undefined) {
          return policyFailure(
            vendorIssue(
              "PayloadMismatch",
              "Vendor declaration binding is not a canonical repository record binding."
            )
          );
        }
        const declarationRead = yield* readRecord(
          declarationBinding.id,
          "declaration",
          decodeVendorSourceDeclaration
        );
        if (!declarationRead.ok) return declarationRead;
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
        if (provenanceRead !== null && !provenanceRead.ok) return provenanceRead;
        const lockRead =
          lockBinding === null
            ? null
            : yield* readRecord(lockBinding.id, "lock", decodeVendorLockRecord);
        if (lockRead !== null && !lockRead.ok) return lockRead;
        const destination = yield* observeDestination(
          declaration.destinationPath,
          identity.objectFormat
        );
        if (!destination.ok) return destination;
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
    return policySuccess(
      createVendorWorkspaceObservation({
        requested: request.contentWorkspace,
        identity,
        releaseInput: releaseInput.value,
        releaseInputBytes: releaseInputAttempt.success,
        sources,
      })
    );
  });

  const observed = yield* observeWorkspace;
  if (!observed.ok) return rejected(observed.issues);
  const workspaceIssue = vendorWorkspaceIssue(request, observed.value);
  if (workspaceIssue !== undefined) return rejected([workspaceIssue]);
  const selected = selectVendorSources(request, observed.value);
  if (!selected.ok) return rejected(selected.issues);

  const candidates: Array<
    Readonly<{
      source: VendorDeclaredSourceObservation;
      upstream: VendorUpstreamObservation;
    }>
  > = [];
  const assessmentIssues: VendorUpdateIssue[] = [];
  for (const source of selected.sources) {
    const remoteAttempt = yield* Effect.result(
      context.versionedContent.observeRemote(vendorRemoteQuery(source))
    );
    if (remoteAttempt._tag === "Failure") {
      assessmentIssues.push(
        vendorUpstreamIssue(remoteAttempt.failure, source.declaration.sourceId)
      );
      continue;
    }
    const validated = validateVendorRemote(source, remoteAttempt.success);
    if (!validated.ok) {
      assessmentIssues.push(...validated.issues);
      continue;
    }
    const ancestryQuery = vendorAncestryQuery(source, validated.value.identity);
    let isAncestor: boolean | null = null;
    if (ancestryQuery !== null) {
      const ancestryAttempt = yield* Effect.result(
        context.versionedContent.isAncestor(ancestryQuery)
      );
      if (ancestryAttempt._tag === "Failure") {
        assessmentIssues.push(
          vendorUpstreamIssue(ancestryAttempt.failure, source.declaration.sourceId)
        );
        continue;
      }
      isAncestor = ancestryAttempt.success;
    }
    const upstream = createVendorUpstreamObservation(
      validated.value.remote,
      validated.value.identity,
      isAncestor
    );
    const assessment = classifyVendorSource(source, upstream);
    if (assessment.issue !== undefined) assessmentIssues.push(assessment.issue);
    if (assessment.candidate !== undefined) {
      candidates.push(Object.freeze({ source, upstream: assessment.candidate }));
    }
  }
  const assessmentFailure = nonEmptyVendorIssues(assessmentIssues);
  if (assessmentFailure !== null) return rejected(assessmentFailure);
  if (candidates.length === 0) {
    return { kind: "ReadOnlyConverged" as const, sourceIds: request.sourceIds };
  }

  const changes: VendorSourceChange[] = [];
  const preparationIssues: VendorUpdateIssue[] = [];
  for (const candidate of candidates) {
    const materializedAttempt = yield* Effect.result(
      context.versionedContent.materializeRemote(vendorMaterializationQuery(candidate.source))
    );
    if (materializedAttempt._tag === "Failure") {
      preparationIssues.push(
        vendorUpstreamIssue(materializedAttempt.failure, candidate.source.declaration.sourceId)
      );
      continue;
    }
    let observedAt: Date;
    try {
      observedAt = context.clock.now();
    } catch {
      preparationIssues.push(
        vendorIssue(
          "RuntimeFailure",
          "Vendor observation clock failed.",
          candidate.source.declaration.sourceId
        )
      );
      continue;
    }
    const prepared = createVendorPreparedPayload(
      candidate.source,
      candidate.upstream,
      materializedAttempt.success,
      observedAt
    );
    if (!prepared.ok) {
      preparationIssues.push(...prepared.issues);
      continue;
    }
    const change = createVendorSourceChange(candidate.source, prepared.value);
    if (!change.ok) preparationIssues.push(...change.issues);
    else changes.push(change.value);
  }
  const preparationFailure = nonEmptyVendorIssues(preparationIssues);
  if (preparationFailure !== null) return rejected(preparationFailure);

  const planned = createVendorAuthoringPlan(request.contentWorkspace, observed.value, changes);
  if (!planned.ok) return rejected(planned.issues);
  const plan = planned.value;

  return yield* Effect.uninterruptible(
    Effect.gen(function* () {
      const releaseCapture = (
        captureHandle: string,
        disposition: "NoMutation" | "UnsettledRecovery"
      ): Effect.Effect<VendorUpdateIssue | undefined> =>
        Effect.gen(function* () {
          const receiptAttempt = yield* Effect.result(
            context.contentWorkspace.release({
              root: plan.contentWorkspace.locator,
              readToken: plan.readToken,
              captureHandle,
              disposition,
            })
          );
          if (receiptAttempt._tag === "Failure") {
            const error = receiptAttempt.failure;
            if (disposition === "NoMutation" && resourceFailureReason(error) === "HandleState") {
              return vendorIssue(
                "RestorationFailed",
                "Captured authoring may have mutated repository state."
              );
            }
            return vendorIssue("CleanupFailed", resourceFailureDetail(error));
          }
          return validVendorReleaseReceipt(receiptAttempt.success, plan, captureHandle, disposition)
            ? undefined
            : vendorIssue(
                "CleanupFailed",
                "Content workspace returned an invalid capture-release receipt."
              );
        });

      const settleCapture = (captureHandle: string): Effect.Effect<VendorUpdateIssue | undefined> =>
        Effect.gen(function* () {
          const receiptAttempt = yield* Effect.result(
            context.contentWorkspace.settle({
              root: plan.contentWorkspace.locator,
              planDigest: plan.planDigest,
              readToken: plan.readToken,
              captureHandle,
            })
          );
          if (receiptAttempt._tag === "Failure") {
            return vendorIssue("CleanupFailed", resourceFailureDetail(receiptAttempt.failure));
          }
          return validVendorSettlementReceipt(receiptAttempt.success, plan, captureHandle)
            ? undefined
            : vendorIssue(
                "CleanupFailed",
                "Content workspace returned an invalid settlement receipt."
              );
        });

      const restoreAfterFailure = (
        captureHandle: string,
        primary: VendorUpdateIssue
      ): Effect.Effect<VendorUpdateResult> =>
        Effect.gen(function* () {
          const restoredAttempt = yield* Effect.result(
            context.contentWorkspace.restore({
              root: plan.contentWorkspace.locator,
              planDigest: plan.planDigest,
              readToken: plan.readToken,
              captureHandle,
            })
          );
          if (restoredAttempt._tag === "Failure") {
            const restoration = vendorIssue(
              "RestorationFailed",
              resourceFailureDetail(restoredAttempt.failure)
            );
            const cleanup = yield* releaseCapture(captureHandle, "UnsettledRecovery");
            return {
              kind: "RestorationFailed",
              sourceIds: request.sourceIds,
              unsettledPaths: plan.changedPaths,
              issues:
                cleanup === undefined ? [primary, restoration] : [primary, restoration, cleanup],
            };
          }
          const restored = restoredAttempt.success;
          if (!validVendorRestoreReceipt(restored, plan)) {
            const restoration = vendorIssue(
              "RestorationFailed",
              "Content workspace returned an invalid restoration receipt."
            );
            const cleanup = yield* releaseCapture(captureHandle, "UnsettledRecovery");
            return {
              kind: "RestorationFailed",
              sourceIds: request.sourceIds,
              unsettledPaths: plan.changedPaths,
              issues:
                cleanup === undefined ? [primary, restoration] : [primary, restoration, cleanup],
            };
          }
          const settlement = yield* settleCapture(captureHandle);
          return {
            kind: "FailedRestored",
            sourceIds: request.sourceIds,
            restoredPaths: [...restored.changedPaths].sort(),
            issues: settlement === undefined ? [primary] : [primary, settlement],
          };
        });

      const captureAttempt = yield* Effect.result(
        context.contentWorkspace.capture({
          root: plan.contentWorkspace.locator,
          readToken: plan.readToken,
          paths: plan.changedPaths,
          maxEntries: MAX_CAPTURE_ENTRIES,
          maxBytes: MAX_CAPTURE_BYTES,
        })
      );
      if (captureAttempt._tag === "Failure") {
        return rejected([
          vendorIssue("AuthoringFailed", resourceFailureDetail(captureAttempt.failure)),
        ]);
      }
      const capture: ContentWorkspaceCapture = captureAttempt.success;
      if (!validVendorCapture(capture, plan)) {
        const cleanup = yield* releaseCapture(capture.handle, "NoMutation");
        const primary = vendorIssue(
          "AuthoringFailed",
          "Content workspace returned an invalid capture receipt."
        );
        return rejected(cleanup === undefined ? [primary] : [primary, cleanup]);
      }

      const revalidated = yield* observeWorkspace;
      const revalidationIssue = revalidated.ok
        ? vendorWorkspaceIssue(request, revalidated.value)
        : revalidated.issues[0];
      if (
        !revalidated.ok ||
        revalidationIssue !== undefined ||
        revalidated.value.readToken !== plan.readToken
      ) {
        const primary = vendorIssue(
          "LocalDrift",
          "Vendor repository changed after preimage capture and before authoring."
        );
        const cleanup = yield* releaseCapture(capture.handle, "NoMutation");
        return rejected(cleanup === undefined ? [primary] : [primary, cleanup]);
      }

      const appliedAttempt = yield* Effect.result(
        context.contentWorkspace.apply({
          root: plan.contentWorkspace.locator,
          planDigest: plan.planDigest,
          readToken: plan.readToken,
          captureHandle: capture.handle,
          writes: plan.writes,
        })
      );
      if (appliedAttempt._tag === "Failure") {
        const primary = vendorIssue(
          "AuthoringFailed",
          resourceFailureDetail(appliedAttempt.failure)
        );
        const released = yield* releaseCapture(capture.handle, "NoMutation");
        if (released === undefined) {
          return rejected([primary]);
        }
        return yield* restoreAfterFailure(capture.handle, primary);
      }
      const applied = appliedAttempt.success;
      if (!validVendorApplyReceipt(applied, plan)) {
        return yield* restoreAfterFailure(
          capture.handle,
          vendorIssue("AuthoringFailed", "Content workspace returned an invalid apply receipt.")
        );
      }

      const verified = yield* observeWorkspace;
      const verificationIssue = verified.ok
        ? vendorWorkspaceIssue(request, verified.value)
        : verified.issues[0];
      if (
        !verified.ok ||
        verificationIssue !== undefined ||
        !vendorPlanIsApplied(verified.value, plan)
      ) {
        const primary = vendorIssue(
          "AuthoringFailed",
          verificationIssue?.detail ??
            "Repository observation does not match the exact service-owned vendor plan."
        );
        if (applied.outcome === "Converged") {
          const cleanup = yield* releaseCapture(capture.handle, "NoMutation");
          return rejected(cleanup === undefined ? [primary] : [primary, cleanup]);
        }
        return yield* restoreAfterFailure(capture.handle, primary);
      }

      const settlement = yield* settleCapture(capture.handle);
      if (settlement !== undefined) {
        if (applied.outcome === "Converged") {
          const cleanup = yield* releaseCapture(capture.handle, "NoMutation");
          return rejected(cleanup === undefined ? [settlement] : [settlement, cleanup]);
        }
        return yield* restoreAfterFailure(capture.handle, settlement);
      }
      return applied.outcome === "Converged"
        ? { kind: "ReadOnlyConverged" as const, sourceIds: request.sourceIds }
        : {
            kind: "AuthoredReviewableChanges" as const,
            sourceIds: request.sourceIds,
            changedPaths: plan.changedPaths,
          };
    })
  );
});
