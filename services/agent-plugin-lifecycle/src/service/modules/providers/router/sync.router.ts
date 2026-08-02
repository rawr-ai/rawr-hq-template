import type {
  NativeAgentProviderFailure,
  NativeAgentProviderSession,
  NativeProviderCapabilities,
  NativeProviderInventory,
  NativeProviderMutationResult,
} from "@habitat-ai/rawr-resource-native-agent-provider";
import {
  NativeProviderCapabilitiesSchema,
  NativeProviderInventorySchema,
  NativeProviderPluginFilesSchema,
} from "@habitat-ai/rawr-resource-native-agent-provider";
import { Effect, Result } from "effect";
import { Value } from "typebox/value";
import type { ReleaseRelativePath } from "#agent-plugin-lifecycle-service/model/dto/release-identity";
import { decodeGitLocator } from "#agent-plugin-lifecycle-service/model/policy/current-main-locator";
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
} from "#agent-plugin-lifecycle-service/model/policy/current-main-selection";
import { deriveReleaseSelection } from "#agent-plugin-lifecycle-service/model/policy/release-derivation";
import { MAX_RELEASE_SET_PAYLOAD_BYTES } from "#agent-plugin-lifecycle-service/model/policy/release-payload-accounting";
import type {
  ConfirmedNativeOperation,
  ProviderIssue,
  ProviderMutationTargetResult,
  ProviderSyncResult,
  ProviderTarget,
  VerificationFact,
} from "../model/dto/provider-lifecycle";
import type { SelectedContent } from "../model/dto/selected-content";
import {
  classifyNativeMutationStep,
  completedMutationTarget,
  failedMutationTarget,
  finalNativeAssessmentIssue,
  marketplaceRemovalIssue,
  type NativeCommandAttempt,
  type NativeInventoryAttempt,
  type NativeMutationStep,
  nativeCommandIsRequired,
  notAttemptedAfterMutation,
  planNativeTargetMutation,
  planOmittedRetirement,
  uncertainMutationTarget,
} from "../model/policy/native-mutation";
import {
  allTargetsConverged,
  assessNativePluginFiles,
  assessNativeTarget,
  blockedTargetResults,
  convergedMutationTargetResult,
  failedNativePluginFiles,
  hasBlockingAssessment,
  type NativeAvailableTargetAssessment,
  type NativePluginFileAssessment,
  type NativeReconciliationPolicy,
  type NativeUnavailableTargetAssessment,
  planNativePluginFileReads,
  unavailableNativeTarget,
} from "../model/policy/native-state";
import {
  canonicalProviderTargets,
  collectTargetIssues,
  mutationClassification,
  rejectedTargets,
  sourceChangedTargets,
} from "../model/policy/operation-result";
import {
  constructSelectedContent,
  providerIssue,
  providerSelectionResolution,
  sameSelectedContent,
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
  planSelectedContentChannelPayloadRead,
  selectSelectedContentChannelManifestEntry,
  validateSelectedNativeMarketplaces,
} from "../model/policy/source-interface";
import { module } from "../module";

/**
 * Authors canonical Provider convergence from a lazily repeated governed
 * channel selection.
 */
export const sync = module.sync.effect(function* ({ context, input }) {
  const canonicalRequest = Object.freeze({
    ...input,
    targets: canonicalProviderTargets(input.targets),
  });
  const locator = decodeGitLocator(canonicalRequest.locator);
  const nativePolicy: NativeReconciliationPolicy = Object.freeze({ retireOmitted: true });

  type AvailableNativeTarget = Readonly<{
    kind: "Available";
    session: NativeAgentProviderSession;
    assessment: NativeAvailableTargetAssessment;
  }>;
  type UnavailableNativeTarget = Readonly<{
    kind: "Unavailable";
    assessment: NativeUnavailableTargetAssessment;
  }>;
  type NativeTargetObservation = AvailableNativeTarget | UnavailableNativeTarget;

  /** Reads selected files and classifies one already-admitted native inventory. */
  const assessInventory = (
    content: SelectedContent,
    target: ProviderTarget,
    session: NativeAgentProviderSession,
    capabilities: NativeProviderCapabilities,
    inventory: NativeProviderInventory,
    mutationIntent: boolean
  ): Effect.Effect<NativeAvailableTargetAssessment> =>
    Effect.gen(function* () {
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

  /**
   * Acquires and preflights one target through its ready native resource.
   *
   * Probe and inventory remain concurrent inside the target. The returned
   * session is invocation-local and is reused only by the final mutation pass.
   */
  const observeTarget = (
    content: SelectedContent,
    target: ProviderTarget,
    mutationIntent: boolean
  ): Effect.Effect<NativeTargetObservation> =>
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
        return Object.freeze({
          kind: "Unavailable" as const,
          assessment: unavailableNativeTarget(
            target,
            `Native provider acquisition failed: ${acquisition.failure.detail}`
          ),
        });
      }
      const session = acquisition.success;
      if (session.provider !== target.provider || session.home !== target.home) {
        return Object.freeze({
          kind: "Unavailable" as const,
          assessment: unavailableNativeTarget(
            target,
            "Native provider acquisition returned a session for a different target."
          ),
        });
      }

      const observation: Effect.Effect<
        readonly [NativeProviderCapabilities, NativeProviderInventory],
        NativeAgentProviderFailure
      > = Effect.all([session.probe(), session.inventory()] as const, { concurrency: 2 });
      const observed = yield* Effect.result(observation);
      if (Result.isFailure(observed)) {
        return Object.freeze({
          kind: "Unavailable" as const,
          assessment: unavailableNativeTarget(
            target,
            `Native provider inspection failed: ${observed.failure.detail}`
          ),
        });
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
        return Object.freeze({
          kind: "Unavailable" as const,
          assessment: unavailableNativeTarget(
            target,
            "Native provider inspection returned facts for a different target."
          ),
        });
      }

      return Object.freeze({
        kind: "Available" as const,
        session,
        assessment: yield* assessInventory(
          content,
          target,
          session,
          capabilities,
          inventory,
          mutationIntent
        ),
      });
    });

  /** Preflights every target sequentially before any target can mutate. */
  const observeTargets = (
    content: SelectedContent,
    targets: readonly ProviderTarget[],
    mutationIntent: boolean
  ): Effect.Effect<readonly NativeTargetObservation[]> =>
    Effect.forEach(targets, (target) => observeTarget(content, target, mutationIntent), {
      concurrency: 1,
    }).pipe(Effect.map((observations) => Object.freeze(observations)));

  /** Recovers best-effort terminal facts without turning evidence into authority. */
  const observeTerminalFacts = (
    content: SelectedContent,
    observation: AvailableNativeTarget
  ): Effect.Effect<readonly VerificationFact[]> =>
    Effect.result(observation.session.inventory()).pipe(
      Effect.flatMap((attempt) => {
        if (
          Result.isFailure(attempt) ||
          !Value.Check(NativeProviderInventorySchema, attempt.success) ||
          attempt.success.provider !== observation.assessment.target.provider
        ) {
          return Effect.succeed(Object.freeze([]));
        }
        return assessInventory(
          content,
          observation.assessment.target,
          observation.session,
          observation.assessment.capabilities,
          attempt.success,
          false
        ).pipe(Effect.map((assessment) => assessment.facts));
      })
    );

  /** Dispatches one policy-admitted command through the already-acquired session. */
  const nativeCommand = (
    content: SelectedContent,
    session: NativeAgentProviderSession,
    operation: ConfirmedNativeOperation
  ):
    | Readonly<{
        kind: "Ready";
        effect: Effect.Effect<NativeProviderMutationResult, NativeAgentProviderFailure>;
      }>
    | Readonly<{ kind: "Refused"; issue: ProviderIssue }> => {
    switch (operation.kind) {
      case "marketplace-added":
        return Object.freeze({
          kind: "Ready",
          effect: session.addMarketplace(content.marketplace.source),
        });
      case "marketplace-removed":
        return Object.freeze({
          kind: "Ready",
          effect: session.removeMarketplace({ identity: operation.identity }),
        });
      case "plugin-installed":
        return Object.freeze({
          kind: "Ready",
          effect: session.installPlugin({ selector: operation.selector }),
        });
      case "plugin-removed":
        return Object.freeze({
          kind: "Ready",
          effect: session.removePlugin({ selector: operation.selector }),
        });
      case "plugin-enabled":
        return session.provider === "claude"
          ? Object.freeze({
              kind: "Ready",
              effect: session.enablePlugin({ selector: operation.selector }),
            })
          : Object.freeze({
              kind: "Refused",
              issue: providerIssue("CapabilityMissing", "Codex did not expose plugin enablement."),
            });
    }
  };

  /** Attempts one native command and immediately observes its postcondition. */
  const mutateAndObserve = (
    content: SelectedContent,
    observation: AvailableNativeTarget,
    operation: ConfirmedNativeOperation
  ): Effect.Effect<NativeMutationStep> =>
    Effect.gen(function* () {
      const dispatch = nativeCommand(content, observation.session, operation);
      if (dispatch.kind === "Refused") {
        return Object.freeze({ kind: "Failed", issue: dispatch.issue });
      }
      const commandAttempt = yield* Effect.result(dispatch.effect);
      const command: NativeCommandAttempt = Result.isFailure(commandAttempt)
        ? Object.freeze({
            kind: "Failed",
            commandPhase: commandAttempt.failure.commandPhase,
            detail: commandAttempt.failure.detail,
          })
        : Object.freeze({ kind: "Returned" });

      const inventoryAttempt = yield* Effect.result(observation.session.inventory());
      const inventory: NativeInventoryAttempt = Result.isFailure(inventoryAttempt)
        ? Object.freeze({ kind: "Failed", detail: inventoryAttempt.failure.detail })
        : !Value.Check(NativeProviderInventorySchema, inventoryAttempt.success) ||
            inventoryAttempt.success.provider !== observation.assessment.target.provider
          ? Object.freeze({
              kind: "Failed",
              detail: "Native provider returned an invalid inventory after mutation.",
            })
          : Object.freeze({ kind: "Observed", inventory: inventoryAttempt.success });
      return classifyNativeMutationStep(content, operation, command, inventory);
    });

  /** Applies one final-preflight mutation plan through its retained session. */
  const mutateTarget = (
    content: SelectedContent,
    observation: AvailableNativeTarget
  ): Effect.Effect<ProviderMutationTargetResult> =>
    Effect.gen(function* () {
      const { assessment, session } = observation;
      let inventory = assessment.inventory;
      const operations: ConfirmedNativeOperation[] = [];
      const issues: ProviderIssue[] = [];

      const terminalResult = (
        step: NativeMutationStep
      ): Effect.Effect<ProviderMutationTargetResult | undefined> =>
        Effect.gen(function* () {
          if (step.kind === "Failed") {
            return failedMutationTarget(
              assessment,
              operations,
              yield* observeTerminalFacts(content, observation),
              [...issues, step.issue]
            );
          }
          if (step.kind === "Uncertain") {
            return uncertainMutationTarget(
              assessment,
              operations,
              step.attempted,
              yield* observeTerminalFacts(content, observation),
              [...issues, step.issue]
            );
          }
          return undefined;
        });

      const acceptCompletedStep = (
        step: NativeMutationStep,
        operation: ConfirmedNativeOperation
      ): void => {
        if (step.kind !== "Confirmed" && step.kind !== "AlreadySatisfied") return;
        inventory = step.inventory;
        if (step.kind === "Confirmed") operations.push(operation);
      };

      for (const plan of planNativeTargetMutation(content, assessment, nativePolicy)) {
        if (plan.kind === "GuardMarketplaceRemoval") {
          const guardAttempt = yield* Effect.result(session.inventory());
          if (Result.isFailure(guardAttempt)) {
            return failedMutationTarget(assessment, operations, Object.freeze([]), [
              ...issues,
              providerIssue(
                "NativeObservationFailed",
                `Marketplace could not be reobserved before removal: ${guardAttempt.failure.detail}`
              ),
            ]);
          }
          if (
            !Value.Check(NativeProviderInventorySchema, guardAttempt.success) ||
            guardAttempt.success.provider !== assessment.target.provider
          ) {
            return failedMutationTarget(assessment, operations, Object.freeze([]), [
              ...issues,
              providerIssue(
                "NativeObservationFailed",
                "Marketplace could not be admitted before removal."
              ),
            ]);
          }
          inventory = guardAttempt.success;
          const guardIssue = marketplaceRemovalIssue(content, inventory);
          if (guardIssue !== undefined) {
            return failedMutationTarget(assessment, operations, Object.freeze([]), [
              ...issues,
              guardIssue,
            ]);
          }
          continue;
        }

        if (plan.kind === "VerifyMember") {
          const fileAttempt = yield* Effect.result(
            session.readPluginFiles({
              selector: plan.plan.selector,
              files: plan.plan.files.map((file) =>
                Object.freeze({ relativePath: file.path, maxBytes: file.byteLength })
              ),
            })
          );
          const verification = Result.isFailure(fileAttempt)
            ? failedNativePluginFiles(
                plan.plan,
                `Could not read the selected files for ${plan.plan.selector}: ${fileAttempt.failure.detail}`
              )
            : !Value.Check(NativeProviderPluginFilesSchema, fileAttempt.success)
              ? failedNativePluginFiles(
                  plan.plan,
                  `Native provider returned an invalid file batch for ${plan.plan.selector}.`
                )
              : assessNativePluginFiles(plan.plan, fileAttempt.success);
          if (!verification.matches) {
            return failedMutationTarget(
              assessment,
              operations,
              yield* observeTerminalFacts(content, observation),
              [...issues, ...verification.issues]
            );
          }
          continue;
        }

        if (plan.kind === "RetireOmitted") {
          const retirement = planOmittedRetirement(content, inventory, operations.length);
          if (!retirement.ok) {
            return failedMutationTarget(assessment, operations, Object.freeze([]), [
              ...issues,
              retirement.issue,
            ]);
          }
          for (const selector of retirement.selectors) {
            const operation: ConfirmedNativeOperation = Object.freeze({
              kind: "plugin-removed",
              selector,
            });
            const step = yield* mutateAndObserve(content, observation, operation);
            const terminal = yield* terminalResult(step);
            if (terminal !== undefined) return terminal;
            acceptCompletedStep(step, operation);
          }
          continue;
        }

        if (!nativeCommandIsRequired(plan, inventory)) continue;
        const step = yield* mutateAndObserve(content, observation, plan.operation);
        const terminal = yield* terminalResult(step);
        if (terminal !== undefined) return terminal;
        acceptCompletedStep(step, plan.operation);
      }

      const finalInventoryAttempt = yield* Effect.result(session.inventory());
      if (Result.isFailure(finalInventoryAttempt)) {
        return failedMutationTarget(assessment, operations, Object.freeze([]), [
          ...issues,
          providerIssue(
            "NativeObservationFailed",
            `Final provider state could not be observed: ${finalInventoryAttempt.failure.detail}`
          ),
        ]);
      }
      if (
        !Value.Check(NativeProviderInventorySchema, finalInventoryAttempt.success) ||
        finalInventoryAttempt.success.provider !== assessment.target.provider
      ) {
        return failedMutationTarget(assessment, operations, Object.freeze([]), [
          ...issues,
          providerIssue(
            "NativeObservationFailed",
            "Final provider state returned an invalid inventory."
          ),
        ]);
      }
      const finalAssessment = yield* assessInventory(
        content,
        assessment.target,
        session,
        assessment.capabilities,
        finalInventoryAttempt.success,
        false
      );
      const finalIssue = finalNativeAssessmentIssue(finalAssessment);
      if (finalIssue !== undefined) {
        return failedMutationTarget(assessment, operations, finalAssessment.facts, [
          ...issues,
          ...finalAssessment.issues,
          finalIssue,
        ]);
      }
      return completedMutationTarget(assessment, operations, finalAssessment.facts, issues);
    });

  /**
   * Performs one complete current-main plus selected-content observation.
   *
   * The Effect is built afresh for each call. The converged path invokes it
   * once; a path that may mutate invokes it once more before native commands.
   */
  const selectChannel = () =>
    !locator.ok
      ? Effect.succeed({
          kind: "Rejected" as const,
          issues: Object.freeze([
            providerIssue("SelectionRejected", `WRONG_REPOSITORY: ${locator.reason}`),
          ]),
        })
      : Effect.gen(function* () {
          const currentMain = yield* Effect.gen(function* () {
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
            const recordRef = classifySelectedGitRef(
              locator.value,
              recordSelection,
              recordRefAttempt
            );
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
            const record = classifyCurrentMainRecord(
              locator.value,
              opening.value,
              recordBlob.value
            );
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

            const releaseInputSelection = currentMainReleaseInputSelection(
              opening.value,
              record.value
            );
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
          if (currentMain.kind !== "CURRENT_ELIGIBLE") {
            return {
              kind: "Rejected" as const,
              issues: Object.freeze([
                providerIssue("SelectionRejected", `${currentMain.kind}: ${currentMain.reason}`),
              ]),
            };
          }

          const channel = classifySelectedContentChannelSelection(
            canonicalRequest.locator,
            currentMain.selection
          );
          if (!channel.ok) return providerSelectionResolution(channel.result);
          const channelOpeningAttempt = yield* Effect.result(
            context.contentWorkspace.inspectGitRef({
              locator: canonicalRequest.locator.workspacePath,
              remoteSelection: { kind: "All" },
              refName: channel.value.sourceRef,
            })
          );
          const channelOpening = classifySelectedContentChannelAnchor(
            channel.value,
            channelOpeningAttempt
          );
          if (!channelOpening.ok) return providerSelectionResolution(channelOpening.result);

          const treeAttempt = yield* Effect.result(
            context.contentWorkspace.readGitTree({
              root: channelOpening.value.observation.root,
              tree: channelOpening.value.observation.tree,
              objectFormat: channelOpening.value.observation.objectFormat,
              paths: CHANNEL_SELECTED_CONTENT_PATHS,
              maxEntries: MAX_SELECTED_CONTENT_TREE_ENTRIES,
              maxBytes: MAX_SELECTED_CONTENT_TREE_BYTES,
            })
          );
          const tree = classifySelectedContentChannelTree(channelOpening.value, treeAttempt);
          if (!tree.ok) return providerSelectionResolution(tree.result);

          const channelReleaseInputAttempt = yield* Effect.result(
            context.contentWorkspace.readGitBlob({
              root: tree.value.observation.root,
              blob: tree.value.releaseInputEntry.objectId,
              objectFormat: tree.value.observation.objectFormat,
              maxBytes: MAX_SELECTED_CONTENT_RELEASE_INPUT_BYTES,
            })
          );
          const channelReleaseInput = classifySelectedContentChannelReleaseInput(
            channel.value,
            tree.value,
            channelReleaseInputAttempt
          );
          if (!channelReleaseInput.ok) {
            return providerSelectionResolution(channelReleaseInput.result);
          }

          const manifestBytes = new Map<ReleaseRelativePath, Uint8Array>();
          for (const path of NATIVE_MARKETPLACE_MANIFESTS) {
            const selectedManifest = selectSelectedContentChannelManifestEntry(
              channelReleaseInput.value,
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
            channelReleaseInput.value.releaseInput,
            manifestBytes
          );
          if (marketplaceIssue !== undefined) {
            return providerSelectionResolution(marketplaceIssue);
          }

          const payloadPlan = planSelectedContentChannelPayloadRead(channelReleaseInput.value);
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
                  revision: channel.value.contentCommit,
                  sparsePaths: [...CHANNEL_NATIVE_MARKETPLACE_SPARSE_PATHS],
                }),
              }),
            })
          );
          if (constructed.kind === "Rejected") return constructed;

          const channelClosingAttempt = yield* Effect.result(
            context.contentWorkspace.inspectGitRef({
              locator: canonicalRequest.locator.workspacePath,
              remoteSelection: { kind: "All" },
              refName: channel.value.sourceRef,
            })
          );
          const channelClosing = classifyClosingSelectedContentChannel(
            channelOpening.value,
            channelClosingAttempt
          );
          return channelClosing.ok
            ? constructed
            : providerSelectionResolution(channelClosing.result);
        });

  const selected = yield* selectChannel();
  if (selected.kind === "Rejected") {
    return {
      operation: "sync",
      classification: "Blocked",
      selection: null,
      targets: rejectedTargets(canonicalRequest.targets, selected.issues),
      issues: selected.issues,
    } satisfies ProviderSyncResult;
  }
  const initialObservations = yield* observeTargets(
    selected.content,
    canonicalRequest.targets,
    true
  );
  const initialAssessments = Object.freeze(
    initialObservations.map((observation) => observation.assessment)
  );
  if (hasBlockingAssessment(initialAssessments)) {
    const targets = blockedTargetResults(initialAssessments);
    return {
      operation: "sync",
      classification: mutationClassification(targets),
      selection: selectedContentObservation(selected.content),
      targets,
      issues: collectTargetIssues(targets),
    } satisfies ProviderSyncResult;
  }
  if (allTargetsConverged(initialAssessments)) {
    const targets = Object.freeze(initialAssessments.map(convergedMutationTargetResult));
    return {
      operation: "sync",
      classification: "Converged",
      selection: selectedContentObservation(selected.content),
      targets,
      issues: collectTargetIssues(targets),
    } satisfies ProviderSyncResult;
  }

  const revalidated = yield* selectChannel();
  if (
    revalidated.kind === "Rejected" ||
    !sameSelectedContent(selected.content, revalidated.content)
  ) {
    const targets = sourceChangedTargets(canonicalRequest.targets);
    return {
      operation: "sync",
      classification: "Blocked",
      selection: selectedContentObservation(selected.content),
      targets,
      issues: collectTargetIssues(targets),
    } satisfies ProviderSyncResult;
  }

  const finalObservations = yield* observeTargets(
    revalidated.content,
    canonicalRequest.targets,
    true
  );
  const finalAssessments = Object.freeze(
    finalObservations.map((observation) => observation.assessment)
  );
  if (hasBlockingAssessment(finalAssessments)) {
    const targets = blockedTargetResults(finalAssessments);
    return {
      operation: "sync",
      classification: mutationClassification(targets),
      selection: selectedContentObservation(revalidated.content),
      targets,
      issues: collectTargetIssues(targets),
    } satisfies ProviderSyncResult;
  }
  const targets: readonly ProviderMutationTargetResult[] = allTargetsConverged(finalAssessments)
    ? Object.freeze(finalAssessments.map(convergedMutationTargetResult))
    : yield* Effect.gen(function* () {
        const results: ProviderMutationTargetResult[] = [];
        for (const [index, observation] of finalObservations.entries()) {
          if (observation.kind === "Unavailable") {
            results.push(
              failedMutationTarget(
                observation.assessment,
                Object.freeze([]),
                observation.assessment.facts,
                observation.assessment.issues
              )
            );
            results.push(
              ...notAttemptedAfterMutation(
                finalObservations.slice(index + 1).map((remaining) => remaining.assessment)
              )
            );
            break;
          }
          if (!observation.assessment.needsMutation) {
            results.push(convergedMutationTargetResult(observation.assessment));
            continue;
          }
          const result = yield* mutateTarget(revalidated.content, observation);
          results.push(result);
          if (result.classification === "Failed" || result.classification === "Uncertain") {
            results.push(
              ...notAttemptedAfterMutation(
                finalObservations.slice(index + 1).map((remaining) => remaining.assessment)
              )
            );
            break;
          }
        }
        return Object.freeze(results);
      });
  return {
    operation: "sync",
    classification: mutationClassification(targets),
    selection: selectedContentObservation(revalidated.content),
    targets,
    issues: collectTargetIssues(targets),
  } satisfies ProviderSyncResult;
});
