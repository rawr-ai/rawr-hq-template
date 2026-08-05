import type {
  NativeAgentProviderFailure,
  NativeAgentProviderSession,
  NativeProviderCapabilities,
  NativeProviderInventory,
} from "@habitat-ai/rawr-resource-native-agent-provider";
import {
  NativeProviderCapabilitiesSchema,
  NativeProviderInventorySchema,
  NativeProviderPluginFilesSchema,
} from "@habitat-ai/rawr-resource-native-agent-provider";
import { Effect, Result } from "effect";
import { Value } from "typebox/value";
import type { ReleaseRelativePath } from "../../../model/dto/release-identity";
import { decodeGitLocator } from "../../../model/policy/current-main-locator";
import {
  CURRENT_MAIN_SELECTION_REF,
  classifyCurrentMainAncestry,
  classifyCurrentMainInspection,
  classifyCurrentMainRecord,
  classifyCurrentMainReleaseInput,
  classifySelectedGitBlob,
  classifySelectedGitRef,
  currentMainRecordSelection,
  currentMainReleaseInputSelection,
  finishCurrentMainSelection,
  MAX_CURRENT_MAIN_GIT_BLOB_BYTES,
} from "../../../model/policy/current-main-selection";
import { deriveReleaseSelection } from "../../../model/policy/release-derivation";
import { MAX_RELEASE_SET_PAYLOAD_BYTES } from "../../../model/policy/release-payload-accounting";
import type { ProviderStatusResult, ProviderTarget } from "../model/dto/provider-lifecycle";
import type { SelectedContent } from "../model/dto/selected-content";
import { hasCanonicalProviderHomes } from "../model/policy/disposable-root";
import {
  assessNativePluginFiles,
  assessNativeTarget,
  failedNativePluginFiles,
  type NativePluginFileAssessment,
  type NativeReconciliationPolicy,
  type NativeTargetAssessment,
  planNativePluginFileReads,
  statusTargetResult,
  unavailableNativeTarget,
} from "../model/policy/native-state";
import {
  canonicalProviderTargets,
  collectTargetIssues,
  rejectedStatusTargets,
} from "../model/policy/operation-result";
import {
  constructSelectedContent,
  providerIssue,
  providerSelectionResolution,
  selectedContentFromReleaseDerivationFailure,
  selectedContentObservation,
} from "../model/policy/selected-content";
import {
  CHANNEL_NATIVE_MARKETPLACE_SPARSE_PATHS,
  CHANNEL_SELECTED_CONTENT_PATHS,
  classifyClosingSelectedContentChannel,
  classifySelectedContentChannelAnchor,
  classifySelectedContentChannelPayloads,
  classifySelectedContentChannelReleaseInput,
  classifySelectedContentChannelSelection,
  classifySelectedContentChannelTree,
  classifySelectedContentManifestBlob,
  MAX_NATIVE_MARKETPLACE_MANIFEST_BYTES,
  MAX_SELECTED_CONTENT_MEMBER_PAYLOAD_BYTES,
  MAX_SELECTED_CONTENT_RELEASE_INPUT_BYTES,
  MAX_SELECTED_CONTENT_TREE_BYTES,
  MAX_SELECTED_CONTENT_TREE_ENTRIES,
  NATIVE_MARKETPLACE_MANIFESTS,
  nativeMarketplaceRevision,
  planSelectedContentChannelPayloadRead,
  selectSelectedContentChannelManifestEntry,
  validateSelectedNativeMarketplaces,
} from "../model/policy/source-interface";
import { module } from "../module";

/**
 * Authors read-only Provider status from one complete governed channel
 * selection followed by live native observation.
 */
export const status = module.status.effect(function* ({ context, errors, input }) {
  const canonicalRequest = Object.freeze({
    ...input,
    targets: canonicalProviderTargets(input.targets),
  });
  if (!hasCanonicalProviderHomes(canonicalRequest.targets)) {
    return yield* Effect.fail(
      errors.BAD_REQUEST({
        message: "Expected a canonical non-root absolute path",
      })
    );
  }
  const locator = decodeGitLocator(canonicalRequest.locator);
  const nativePolicy: NativeReconciliationPolicy = Object.freeze({ retireOmitted: true });

  /**
   * Acquires and observes one target through its ready native resource.
   *
   * Probe and inventory remain concurrent within the target. File batches run
   * sequentially after TypeBox admits the provider observation.
   */
  const observeTarget = (
    content: SelectedContent,
    target: ProviderTarget,
    mutationIntent: boolean
  ): Effect.Effect<NativeTargetAssessment> =>
    Effect.gen(function* () {
      const acquire: Effect.Effect<NativeAgentProviderSession, NativeAgentProviderFailure> =
        target.provider === "codex"
          ? context.nativeProviders.codex
              .acquire({ home: target.home })
              .pipe(Effect.map((session): NativeAgentProviderSession => session))
          : context.nativeProviders.claude
              .acquire({ home: target.home })
              .pipe(Effect.map((session): NativeAgentProviderSession => session));
      const acquisition = yield* Effect.result(acquire);
      if (Result.isFailure(acquisition)) {
        return unavailableNativeTarget(
          target,
          `Native provider acquisition failed: ${acquisition.failure.detail}`
        );
      }
      const session: NativeAgentProviderSession = acquisition.success;
      if (session.provider !== target.provider || session.home !== target.home) {
        return unavailableNativeTarget(
          target,
          "Native provider acquisition returned a session for a different target."
        );
      }

      const observation: Effect.Effect<
        readonly [NativeProviderCapabilities, NativeProviderInventory],
        NativeAgentProviderFailure
      > = Effect.all([session.probe(), session.inventory()] as const, { concurrency: 2 });
      const observed = yield* Effect.result(observation);
      if (Result.isFailure(observed)) {
        return unavailableNativeTarget(
          target,
          `Native provider inspection failed: ${observed.failure.detail}`
        );
      }
      const [capabilities, inventory] = observed.success;
      if (
        !Value.Check(NativeProviderCapabilitiesSchema, capabilities) ||
        !Value.Check(NativeProviderInventorySchema, inventory) ||
        capabilities.provider !== target.provider ||
        inventory.provider !== target.provider ||
        capabilities.home !== target.home ||
        (session.provider === "claude" &&
          (typeof session.enablePlugin !== "function" ||
            !new Set<string>(capabilities.capabilities).has("plugin-enable")))
      ) {
        return unavailableNativeTarget(
          target,
          "Native provider inspection returned facts for a different target."
        );
      }

      const fileAssessments: NativePluginFileAssessment[] = [];
      for (const plan of planNativePluginFileReads(content, target, inventory)) {
        const attempt = yield* Effect.result(
          session.readPluginFiles({
            selector: plan.selector,
            files: plan.files.map((file) =>
              Object.freeze({ relativePath: file.path, maxBytes: file.byteLength })
            ),
          })
        );
        fileAssessments.push(
          Result.isFailure(attempt)
            ? failedNativePluginFiles(
                plan,
                `Could not read the selected files for ${plan.selector}: ${attempt.failure.detail}`
              )
            : !Value.Check(NativeProviderPluginFilesSchema, attempt.success)
              ? failedNativePluginFiles(
                  plan,
                  `Native provider returned an invalid file batch for ${plan.selector}.`
                )
              : assessNativePluginFiles(plan, attempt.success)
        );
      }
      return assessNativeTarget(
        content,
        target,
        capabilities,
        inventory,
        fileAssessments,
        nativePolicy,
        mutationIntent
      );
    });

  /** Observes targets in canonical order without inter-target concurrency. */
  const observeTargets = (
    content: SelectedContent,
    targets: readonly ProviderTarget[],
    mutationIntent: boolean
  ) =>
    Effect.forEach(targets, (target) => observeTarget(content, target, mutationIntent), {
      concurrency: 1,
    }).pipe(Effect.map((assessments) => Object.freeze(assessments)));
  const currentMain = !locator.ok
    ? Object.freeze({
        kind: "WRONG_REPOSITORY" as const,
        reason: locator.reason,
      })
    : yield* Effect.gen(function* () {
        const openingAttempt = yield* Effect.result(
          context.contentWorkspace.inspectGitRef({
            locator: locator.value.workspacePath,
            remoteSelection: { kind: "All" },
            refName: CURRENT_MAIN_SELECTION_REF,
          })
        );
        const opening = classifyCurrentMainInspection(locator.value, openingAttempt);
        if (!opening.ok) return opening.result;

        const recordSelection = currentMainRecordSelection(opening.value);
        const recordRefAttempt = yield* Effect.result(
          context.contentWorkspace.inspectGitRef({
            locator: locator.value.workspacePath,
            remoteSelection: { kind: "All" },
            refName: recordSelection.ref,
          })
        );
        const recordRef = classifySelectedGitRef(locator.value, recordSelection, recordRefAttempt);
        if (!recordRef.ok) return recordRef.result;
        const recordBlobAttempt = yield* Effect.result(
          context.contentWorkspace.readGitBlobAtPath({
            root: recordRef.value.root,
            refName: recordSelection.ref,
            commit: recordSelection.commit,
            tree: recordSelection.tree,
            path: recordSelection.path,
            maxBytes: MAX_CURRENT_MAIN_GIT_BLOB_BYTES,
          })
        );
        const recordBlob = classifySelectedGitBlob(recordSelection, recordBlobAttempt);
        if (!recordBlob.ok) return recordBlob.result;
        const record = classifyCurrentMainRecord(locator.value, opening.value, recordBlob.value);
        if (!record.ok) return record.result;

        const ancestryAttempt = yield* Effect.result(
          context.contentWorkspace.isLocalGitAncestor({
            root: locator.value.workspacePath,
            ancestorCommit: record.value.contentCommit,
            descendantCommit: opening.value.headCommit,
          })
        );
        const ancestryFailure = classifyCurrentMainAncestry(ancestryAttempt);
        if (ancestryFailure !== undefined) return ancestryFailure;

        const releaseInputSelection = currentMainReleaseInputSelection(opening.value, record.value);
        const releaseInputRefAttempt = yield* Effect.result(
          context.contentWorkspace.inspectGitRef({
            locator: locator.value.workspacePath,
            remoteSelection: { kind: "All" },
            refName: releaseInputSelection.ref,
          })
        );
        const releaseInputRef = classifySelectedGitRef(
          locator.value,
          releaseInputSelection,
          releaseInputRefAttempt
        );
        if (!releaseInputRef.ok) return releaseInputRef.result;
        const releaseInputBlobAttempt = yield* Effect.result(
          context.contentWorkspace.readGitBlobAtPath({
            root: releaseInputRef.value.root,
            refName: releaseInputSelection.ref,
            commit: releaseInputSelection.commit,
            tree: releaseInputSelection.tree,
            path: releaseInputSelection.path,
            maxBytes: MAX_CURRENT_MAIN_GIT_BLOB_BYTES,
          })
        );
        const releaseInputBlob = classifySelectedGitBlob(
          releaseInputSelection,
          releaseInputBlobAttempt
        );
        if (!releaseInputBlob.ok) return releaseInputBlob.result;
        const releaseInputFailure = classifyCurrentMainReleaseInput(
          record.value,
          releaseInputBlob.value
        );
        if (releaseInputFailure !== undefined) return releaseInputFailure;

        const closingAttempt = yield* Effect.result(
          context.contentWorkspace.inspectGitRef({
            locator: locator.value.workspacePath,
            remoteSelection: { kind: "All" },
            refName: CURRENT_MAIN_SELECTION_REF,
          })
        );
        const closing = classifyCurrentMainInspection(locator.value, closingAttempt);
        if (!closing.ok) return closing.result;
        return finishCurrentMainSelection(opening.value, closing.value, record.value.record);
      });

  const selected =
    currentMain.kind !== "CURRENT_ELIGIBLE"
      ? {
          kind: "Rejected" as const,
          issues: Object.freeze([
            providerIssue("SelectionRejected", `${currentMain.kind}: ${currentMain.reason}`),
          ]),
        }
      : yield* Effect.gen(function* () {
          const channel = classifySelectedContentChannelSelection(
            canonicalRequest.locator,
            currentMain.selection
          );
          if (!channel.ok) return providerSelectionResolution(channel.result);

          const openingAttempt = yield* Effect.result(
            context.contentWorkspace.inspectGitRef({
              locator: canonicalRequest.locator.workspacePath,
              remoteSelection: { kind: "All" },
              refName: channel.value.sourceRef,
            })
          );
          const opening = classifySelectedContentChannelAnchor(channel.value, openingAttempt);
          if (!opening.ok) return providerSelectionResolution(opening.result);

          const treeAttempt = yield* Effect.result(
            context.contentWorkspace.readGitTree({
              root: opening.value.observation.root,
              tree: opening.value.observation.tree,
              objectFormat: opening.value.observation.objectFormat,
              paths: CHANNEL_SELECTED_CONTENT_PATHS,
              maxEntries: MAX_SELECTED_CONTENT_TREE_ENTRIES,
              maxBytes: MAX_SELECTED_CONTENT_TREE_BYTES,
            })
          );
          const tree = classifySelectedContentChannelTree(opening.value, treeAttempt);
          if (!tree.ok) return providerSelectionResolution(tree.result);

          const releaseInputAttempt = yield* Effect.result(
            context.contentWorkspace.readGitBlob({
              root: tree.value.observation.root,
              blob: tree.value.releaseInputEntry.objectId,
              objectFormat: tree.value.observation.objectFormat,
              maxBytes: MAX_SELECTED_CONTENT_RELEASE_INPUT_BYTES,
            })
          );
          const releaseInput = classifySelectedContentChannelReleaseInput(
            channel.value,
            tree.value,
            releaseInputAttempt
          );
          if (!releaseInput.ok) return providerSelectionResolution(releaseInput.result);

          const manifestBytes = new Map<ReleaseRelativePath, Uint8Array>();
          for (const path of NATIVE_MARKETPLACE_MANIFESTS) {
            const selectedManifest = selectSelectedContentChannelManifestEntry(
              releaseInput.value,
              path
            );
            if (!selectedManifest.ok) {
              return providerSelectionResolution(selectedManifest.result);
            }
            const entry = selectedManifest.value;
            const manifestAttempt = yield* Effect.result(
              context.contentWorkspace.readGitBlob({
                root: tree.value.observation.root,
                blob: entry.objectId,
                objectFormat: tree.value.observation.objectFormat,
                maxBytes: MAX_NATIVE_MARKETPLACE_MANIFEST_BYTES,
              })
            );
            const manifest = classifySelectedContentManifestBlob(path, manifestAttempt);
            if (!manifest.ok) return providerSelectionResolution(manifest.result);
            manifestBytes.set(path, manifest.value);
          }
          const marketplaceIssue = validateSelectedNativeMarketplaces(
            releaseInput.value.releaseInput,
            manifestBytes
          );
          if (marketplaceIssue !== undefined) {
            return providerSelectionResolution(marketplaceIssue);
          }

          const payloadPlan = planSelectedContentChannelPayloadRead(releaseInput.value);
          if (!payloadPlan.ok) return providerSelectionResolution(payloadPlan.result);
          const payloadAttempt = yield* Effect.result(
            context.contentWorkspace.readGitBlobs({
              root: payloadPlan.value.observation.root,
              blobs: payloadPlan.value.blobs,
              objectFormat: payloadPlan.value.observation.objectFormat,
              maxBlobs: MAX_SELECTED_CONTENT_TREE_ENTRIES,
              maxBlobBytes: MAX_SELECTED_CONTENT_MEMBER_PAYLOAD_BYTES,
              maxTotalBytes: MAX_RELEASE_SET_PAYLOAD_BYTES,
            })
          );
          const payloads = classifySelectedContentChannelPayloads(
            payloadPlan.value,
            payloadAttempt
          );
          if (!payloads.ok) return providerSelectionResolution(payloads.result);

          const derivation = deriveReleaseSelection(
            {
              repositoryIdentity: channel.value.sourceRepositoryIdentity,
              sourceCommit: channel.value.contentCommit,
              sourceTree: channel.value.contentTree,
              releaseInput: payloads.value.releaseInput,
              payloads: payloads.value.payloads,
            },
            { kind: "complete-set" }
          );
          if (!derivation.ok) {
            return providerSelectionResolution(
              selectedContentFromReleaseDerivationFailure(derivation.failure)
            );
          }
          const constructed = providerSelectionResolution(
            constructSelectedContent({
              derivation: derivation.value,
              selectionKind: "complete-set",
              marketplace: Object.freeze({
                identity: channel.value.contentAuthority,
                source: Object.freeze({
                  kind: "git",
                  repositoryUrl: channel.value.sourceRepositoryUrl,
                  revision: nativeMarketplaceRevision(channel.value.sourceRef),
                  sparsePaths: [...CHANNEL_NATIVE_MARKETPLACE_SPARSE_PATHS],
                }),
              }),
            })
          );
          if (constructed.kind === "Rejected") return constructed;

          const closingAttempt = yield* Effect.result(
            context.contentWorkspace.inspectGitRef({
              locator: canonicalRequest.locator.workspacePath,
              remoteSelection: { kind: "All" },
              refName: channel.value.sourceRef,
            })
          );
          const closing = classifyClosingSelectedContentChannel(opening.value, closingAttempt);
          return closing.ok ? constructed : providerSelectionResolution(closing.result);
        });

  if (selected.kind === "Rejected") {
    return {
      operation: "status",
      classification: "Blocked",
      selection: null,
      targets: rejectedStatusTargets(canonicalRequest.targets, selected.issues),
      issues: selected.issues,
    } satisfies ProviderStatusResult;
  }
  const assessments = yield* observeTargets(selected.content, canonicalRequest.targets, false);
  const targets = Object.freeze(assessments.map(statusTargetResult));
  const classification = targets.some((target) => target.classification === "Blocked")
    ? "Blocked"
    : targets.some((target) => target.classification === "Failed")
      ? "Failed"
      : targets.some((target) => target.classification === "Drifted")
        ? "Drifted"
        : "Converged";
  return {
    operation: "status",
    classification,
    selection: selectedContentObservation(selected.content),
    targets,
    issues: collectTargetIssues(targets),
  } satisfies ProviderStatusResult;
});
