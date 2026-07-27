import type {
  NativeAgentProviderFailure,
  NativeAgentProviderSession,
  NativeProviderCapabilities,
  NativeProviderInventory,
} from "@rawr/resource-native-agent-provider";
import {
  NativeProviderCapabilitiesSchema,
  NativeProviderInventorySchema,
  NativeProviderPluginFilesSchema,
} from "@rawr/resource-native-agent-provider";
import { Effect, Result } from "effect";
import { Value } from "typebox/value";

import {
  classifyCleanContentWorkspaceAnchor,
  classifyCleanContentWorkspaceTree,
  classifyCleanPayloads,
  classifyCleanReleaseInput,
  classifyCleanWorkspaceEvidence,
  classifyClosingCleanWorkspaceEvidence,
  finishCleanContentWorkspaceInspection,
  MAX_CLEAN_CONTENT_INDEX_BYTES,
  MAX_CLEAN_CONTENT_TREE_BYTES,
  MAX_CLEAN_CONTENT_TREE_ENTRIES,
  MAX_CLEAN_CONTENT_WORKTREE_BYTES,
  MAX_CLEAN_CONTENT_WORKTREE_FILE_BYTES,
  MAX_CLEAN_MEMBER_PAYLOAD_BYTES,
  MAX_CLEAN_RELEASE_INPUT_BYTES,
  MAX_CLEAN_RELEASE_SET_PAYLOAD_BYTES,
  validateCleanContentWorkspacePolicy,
} from "#agent-plugin-lifecycle-service/model/policy/clean-content-workspace";
import { deriveReleaseSelection } from "#agent-plugin-lifecycle-service/model/policy/release-derivation";
import type {
  ConfirmedNativeOperation,
  ProviderIssue,
  ProviderMutationTargetResult,
  ProviderTarget,
  ProviderTestResult,
  VerificationFact,
} from "../model/dto/provider-lifecycle";
import type { SelectedContent } from "../model/dto/selected-content";
import {
  classifyNativeMutationStep,
  completedMutationTarget,
  failedMutationTarget,
  finalNativeAssessmentIssue,
  marketplaceRemovalIssue,
  nativeCommandIsRequired,
  notAttemptedAfterMutation,
  planNativeTargetMutation,
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
  type NativePluginFileReadPlan,
  type NativeReconciliationPolicy,
  type NativeTargetAssessment,
  type NativeUnavailableTargetAssessment,
  planNativePluginFileReads,
  unavailableNativeTarget,
} from "../model/policy/native-state";
import {
  blockedProviderTestResult,
  canonicalProviderTargets,
  completedProviderTestResult,
  rejectedTargets,
  sourceChangedTargets,
} from "../model/policy/operation-result";
import {
  constructSelectedContent,
  providerIssue,
  providerSelectionResolution,
  sameSelectedContent,
  selectedContentFromReleaseDerivationFailure,
  selectedContentFromSourceIssues,
  selectedContentRejected,
} from "../model/policy/selected-content";
import {
  classifyLocalSelectedContentManifest,
  classifySelectedContentInterfaceTree,
  classifySelectedContentManifestBlob,
  MAX_NATIVE_MARKETPLACE_MANIFEST_BYTES,
  NATIVE_MARKETPLACE_INTERFACE_PATHS,
  SELECTED_CONTENT_PLUGIN_ROOT,
  SELECTED_CONTENT_RELEASE_INPUT_PATH,
  validateSelectedNativeMarketplaces,
} from "../model/policy/source-interface";
import { module } from "../module";

/**
 * Authors disposable Provider convergence from exact local Git content.
 *
 * @remarks
 * Source selection is deliberately invocation-local. The handler sequences
 * ready resources, passes typed facts into pure policy, and completes two
 * independent selections before admitting any native mutation.
 */
export const test = module.test.effect(function* ({ context, input: request }) {
  const canonicalRequest = Object.freeze({
    ...request,
    targets: canonicalProviderTargets(request.targets),
  });
  const policy = canonicalRequest.contentWorkspace;
  const nativePolicy: NativeReconciliationPolicy = Object.freeze({ retireOmitted: false });

  /**
   * Executes one complete clean-content observation lazily for each call.
   *
   * This procedure-owned group establishes the exact Git snapshot used by
   * selection without creating a reusable reader or a second resource face.
   */
  const inspectCleanWorkspace = () =>
    Effect.gen(function* () {
      const policyIssue = validateCleanContentWorkspacePolicy(policy);
      if (policyIssue !== undefined) {
        return {
          kind: "Ineligible" as const,
          issues: [policyIssue] as const,
        };
      }

      const anchorAttempt = yield* Effect.result(
        context.contentWorkspace.inspectGitWorkspace({
          locator: policy.locator,
          remoteSelection: { kind: "Named", remoteName: policy.remoteName },
          refName: policy.refName,
        })
      );
      const anchor = classifyCleanContentWorkspaceAnchor(policy, anchorAttempt);
      if (!anchor.ok) return anchor.result;

      const treeAttempt = yield* Effect.result(
        context.contentWorkspace.readGitTree({
          root: anchor.value.anchor.root,
          tree: anchor.value.anchor.tree,
          objectFormat: anchor.value.anchor.objectFormat,
          paths: [policy.releaseInputPath, policy.pluginRoot],
          maxEntries: MAX_CLEAN_CONTENT_TREE_ENTRIES,
          maxBytes: MAX_CLEAN_CONTENT_TREE_BYTES,
        })
      );
      const tree = classifyCleanContentWorkspaceTree(policy, anchor.value, treeAttempt);
      if (!tree.ok) return tree.result;

      const releaseInputAttempt = yield* Effect.result(
        context.contentWorkspace.readGitBlob({
          root: tree.value.anchor.root,
          blob: tree.value.releaseInputEntry.objectId,
          objectFormat: tree.value.anchor.objectFormat,
          maxBytes: MAX_CLEAN_RELEASE_INPUT_BYTES,
        })
      );
      const releaseInput = classifyCleanReleaseInput(policy, tree.value, releaseInputAttempt);
      if (!releaseInput.ok) return releaseInput.result;

      const payloadAttempt = yield* Effect.result(
        context.contentWorkspace.readGitBlobs({
          root: releaseInput.value.anchor.root,
          blobs: releaseInput.value.blobEntries.map((entry) => entry.objectId),
          objectFormat: releaseInput.value.anchor.objectFormat,
          maxBlobs: MAX_CLEAN_CONTENT_TREE_ENTRIES,
          maxBlobBytes: MAX_CLEAN_MEMBER_PAYLOAD_BYTES,
          maxTotalBytes: MAX_CLEAN_RELEASE_SET_PAYLOAD_BYTES,
        })
      );
      const payloads = classifyCleanPayloads(releaseInput.value, payloadAttempt);
      if (!payloads.ok) return payloads.result;

      const evidenceRequest = {
        root: payloads.value.anchor.root,
        remoteSelection: { kind: "Named" as const, remoteName: policy.remoteName },
        refName: policy.refName,
        admittedPaths: payloads.value.admittedPaths,
        consumedRoots: payloads.value.consumedRoots,
        objectFormat: payloads.value.anchor.objectFormat,
        maxPaths: MAX_CLEAN_CONTENT_TREE_ENTRIES,
        maxWorktreeFileBytes: MAX_CLEAN_CONTENT_WORKTREE_FILE_BYTES,
        maxWorktreeBytes: MAX_CLEAN_CONTENT_WORKTREE_BYTES,
        maxBytes: MAX_CLEAN_CONTENT_INDEX_BYTES,
      };
      const openingEvidenceAttempt = yield* Effect.result(
        context.contentWorkspace.captureGitWorkspaceEvidence(evidenceRequest)
      );
      const openingEvidence = classifyCleanWorkspaceEvidence(
        policy,
        payloads.value,
        openingEvidenceAttempt
      );
      if (!openingEvidence.ok) return openingEvidence.result;

      const closingEvidenceAttempt = yield* Effect.result(
        context.contentWorkspace.captureGitWorkspaceEvidence(evidenceRequest)
      );
      const closingEvidence = classifyClosingCleanWorkspaceEvidence(
        payloads.value,
        closingEvidenceAttempt
      );
      if (!closingEvidence.ok) return closingEvidence.result;

      return finishCleanContentWorkspaceInspection(
        policy,
        payloads.value,
        openingEvidence.value,
        closingEvidence.value
      );
    });

  /**
   * Resolves one complete disposable-test selection from current resource facts.
   *
   * Each call performs fresh clean inspection, interface reads, local manifest
   * checks, clean revalidation, and final manifest rereads. Nothing is memoized.
   */
  const selectWorkspace = () =>
    Effect.gen(function* () {
      if (
        policy.releaseInputPath !== SELECTED_CONTENT_RELEASE_INPUT_PATH ||
        policy.pluginRoot !== SELECTED_CONTENT_PLUGIN_ROOT
      ) {
        return providerSelectionResolution(
          selectedContentRejected(
            "SourceIneligible",
            `Local provider content must use ${SELECTED_CONTENT_RELEASE_INPUT_PATH} and ${SELECTED_CONTENT_PLUGIN_ROOT}.`
          )
        );
      }

      const inspected = yield* inspectCleanWorkspace();
      if (inspected.kind === "Ineligible") {
        return providerSelectionResolution(selectedContentFromSourceIssues(inspected.issues));
      }

      const objectFormat = inspected.snapshot.sourceCommit.length === 40 ? "sha1" : "sha256";
      const interfaceTreeAttempt = yield* Effect.result(
        context.contentWorkspace.readGitTree({
          root: policy.locator,
          tree: inspected.snapshot.sourceTree,
          objectFormat,
          paths: NATIVE_MARKETPLACE_INTERFACE_PATHS,
          maxEntries: MAX_CLEAN_CONTENT_TREE_ENTRIES,
          maxBytes: MAX_CLEAN_CONTENT_TREE_BYTES,
        })
      );
      const interfaceTree = classifySelectedContentInterfaceTree(interfaceTreeAttempt);
      if (!interfaceTree.ok) return providerSelectionResolution(interfaceTree.result);

      const manifestBytes = new Map<
        (typeof interfaceTree.value.manifestEntries)[number]["path"],
        Uint8Array
      >();
      for (const entry of interfaceTree.value.manifestEntries) {
        const manifestAttempt = yield* Effect.result(
          context.contentWorkspace.readGitBlob({
            root: policy.locator,
            blob: entry.objectId,
            objectFormat,
            maxBytes: MAX_NATIVE_MARKETPLACE_MANIFEST_BYTES,
          })
        );
        const manifest = classifySelectedContentManifestBlob(entry.path, manifestAttempt);
        if (!manifest.ok) return providerSelectionResolution(manifest.result);
        manifestBytes.set(entry.path, manifest.value);
      }

      const marketplaceIssue = validateSelectedNativeMarketplaces(
        inspected.snapshot.releaseInput,
        manifestBytes
      );
      if (marketplaceIssue !== undefined) {
        return providerSelectionResolution(marketplaceIssue);
      }

      for (const [path, expected] of manifestBytes) {
        const localAttempt = yield* Effect.result(
          context.contentWorkspace.readFile({
            root: policy.locator,
            path,
            maxBytes: MAX_NATIVE_MARKETPLACE_MANIFEST_BYTES,
          })
        );
        const local = classifyLocalSelectedContentManifest(path, expected, localAttempt);
        if (!local.ok) return providerSelectionResolution(local.result);
      }

      const derivation = deriveReleaseSelection(
        inspected.snapshot,
        canonicalRequest.mode.kind === "targeted"
          ? {
              kind: "subset",
              pluginIds: canonicalRequest.mode.pluginIds,
            }
          : canonicalRequest.mode
      );
      if (!derivation.ok) {
        return providerSelectionResolution(
          selectedContentFromReleaseDerivationFailure(derivation.failure)
        );
      }
      const constructed = providerSelectionResolution(
        constructSelectedContent({
          derivation: derivation.value,
          selectionKind: canonicalRequest.mode.kind,
          marketplace: Object.freeze({
            identity: policy.contentAuthority,
            source: Object.freeze({ kind: "local", root: policy.locator }),
          }),
        })
      );
      if (constructed.kind === "Rejected") return constructed;

      const revalidated = yield* inspectCleanWorkspace();
      if (revalidated.kind === "Ineligible") {
        return providerSelectionResolution(selectedContentFromSourceIssues(revalidated.issues));
      }
      if (revalidated.snapshot.eligibilityBinding !== inspected.snapshot.eligibilityBinding) {
        return providerSelectionResolution(
          selectedContentRejected(
            "SelectionMismatch",
            "Local content changed before provider testing."
          )
        );
      }

      for (const [path, expected] of manifestBytes) {
        const localAttempt = yield* Effect.result(
          context.contentWorkspace.readFile({
            root: policy.locator,
            path,
            maxBytes: MAX_NATIVE_MARKETPLACE_MANIFEST_BYTES,
          })
        );
        const local = classifyLocalSelectedContentManifest(path, expected, localAttempt);
        if (!local.ok) return providerSelectionResolution(local.result);
      }
      return constructed;
    });

  type NativeTargetObservation =
    | Readonly<{
        kind: "Available";
        assessment: NativeAvailableTargetAssessment;
        session: NativeAgentProviderSession;
      }>
    | Readonly<{
        kind: "Unavailable";
        assessment: NativeUnavailableTargetAssessment;
      }>;

  /**
   * Reads and structurally admits one native inventory observation.
   *
   * Typed provider failures remain ordinary facts. Defects and interruption
   * continue through the Effect cause channel.
   */
  const observeInventory = (
    session: NativeAgentProviderSession,
    target: ProviderTarget
  ): Effect.Effect<
    | Readonly<{ kind: "Observed"; inventory: NativeProviderInventory }>
    | Readonly<{ kind: "Failed"; detail: string }>
  > =>
    Effect.result(session.inventory()).pipe(
      Effect.map((attempt) => {
        if (Result.isFailure(attempt)) {
          return Object.freeze({
            kind: "Failed" as const,
            detail: attempt.failure.detail,
          });
        }
        return !Value.Check(NativeProviderInventorySchema, attempt.success) ||
          attempt.success.provider !== target.provider
          ? Object.freeze({
              kind: "Failed" as const,
              detail: "Native provider returned an invalid inventory.",
            })
          : Object.freeze({ kind: "Observed" as const, inventory: attempt.success });
      })
    );

  /**
   * Reads one selected plugin file batch and admits the provider response.
   *
   * The resource owns the read. TypeBox owns the returned structure, and
   * Provider policy owns exact byte identity.
   */
  const assessPluginFilePlan = (
    session: NativeAgentProviderSession,
    plan: NativePluginFileReadPlan
  ): Effect.Effect<NativePluginFileAssessment> =>
    Effect.gen(function* () {
      const attempt = yield* Effect.result(
        session.readPluginFiles({
          selector: plan.selector,
          files: plan.files.map((file) =>
            Object.freeze({ relativePath: file.path, maxBytes: file.byteLength })
          ),
        })
      );
      return Result.isFailure(attempt)
        ? failedNativePluginFiles(
            plan,
            `Could not read the selected files for ${plan.selector}: ${attempt.failure.detail}`
          )
        : !Value.Check(NativeProviderPluginFilesSchema, attempt.success)
          ? failedNativePluginFiles(
              plan,
              `Native provider returned an invalid file batch for ${plan.selector}.`
            )
          : assessNativePluginFiles(plan, attempt.success);
    });

  /**
   * Reads selected plugin files and reduces them to pure assessment facts.
   *
   * File mechanics stay on the acquired session while byte identity and
   * selected-member semantics remain in Provider policy.
   *
   * @param content - Exact selected content whose member files are observed.
   * @param target - Disposable provider target associated with the inventory.
   * @param session - Invocation-local native session that owns file mechanics.
   * @param inventory - TypeBox-admitted inventory used to plan bounded reads.
   */
  const assessPluginFiles = (
    content: SelectedContent,
    target: ProviderTarget,
    session: NativeAgentProviderSession,
    inventory: NativeProviderInventory
  ): Effect.Effect<readonly NativePluginFileAssessment[]> =>
    Effect.gen(function* () {
      const assessments: NativePluginFileAssessment[] = [];
      for (const plan of planNativePluginFileReads(content, target, inventory)) {
        assessments.push(yield* assessPluginFilePlan(session, plan));
      }
      return Object.freeze(assessments);
    });

  /**
   * Reduces one admitted session observation to effect-free Provider policy.
   *
   * @param content - Exact selected content used as native desired state.
   * @param target - Disposable provider target associated with the session.
   * @param session - Invocation-local native session used for selected file reads.
   * @param capabilities - TypeBox-admitted commands exposed by the session.
   * @param inventory - TypeBox-admitted live provider inventory.
   * @param mutationIntent - Whether this observation must admit planned commands.
   */
  const assessInventory = (
    content: SelectedContent,
    target: ProviderTarget,
    session: NativeAgentProviderSession,
    capabilities: NativeProviderCapabilities,
    inventory: NativeProviderInventory,
    mutationIntent: boolean
  ): Effect.Effect<NativeAvailableTargetAssessment> =>
    assessPluginFiles(content, target, session, inventory).pipe(
      Effect.map((fileAssessments) =>
        assessNativeTarget(
          content,
          target,
          capabilities,
          inventory,
          fileAssessments,
          nativePolicy,
          mutationIntent
        )
      )
    );

  /**
   * Acquires and completely observes one disposable provider target.
   *
   * Probe and inventory run concurrently inside the target. Targets themselves
   * remain sequential so a full preflight has one deterministic order.
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
      const session: NativeAgentProviderSession = acquisition.success;
      if (
        session.provider !== target.provider ||
        session.home !== target.home ||
        session.executablePath.length === 0
      ) {
        return Object.freeze({
          kind: "Unavailable" as const,
          assessment: unavailableNativeTarget(
            target,
            "Native provider acquisition returned a session for a different target."
          ),
        });
      }

      const inspection: Effect.Effect<
        readonly [NativeProviderCapabilities, NativeProviderInventory],
        NativeAgentProviderFailure
      > = Effect.all([session.probe(), session.inventory()] as const, { concurrency: 2 });
      const observed = yield* Effect.result(inspection);
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
        capabilities.executablePath !== session.executablePath ||
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

      const assessment = yield* assessInventory(
        content,
        target,
        session,
        capabilities,
        inventory,
        mutationIntent
      );
      return Object.freeze({ kind: "Available" as const, assessment, session });
    });

  /** Observes all targets sequentially while retaining only invocation-local sessions. */
  const observeTargets = (
    content: SelectedContent,
    targets: readonly ProviderTarget[],
    mutationIntent: boolean
  ) =>
    Effect.forEach(targets, (target) => observeTarget(content, target, mutationIntent), {
      concurrency: 1,
    }).pipe(Effect.map((observations) => Object.freeze(observations)));

  /** Best-effort terminal observation for public failure diagnostics. */
  const observeTerminalFacts = (
    content: SelectedContent,
    observation: Extract<NativeTargetObservation, { kind: "Available" }>
  ): Effect.Effect<readonly VerificationFact[]> =>
    Effect.gen(function* () {
      const inventory = yield* observeInventory(observation.session, observation.assessment.target);
      if (inventory.kind === "Failed") return Object.freeze([]);
      const assessment = yield* assessInventory(
        content,
        observation.assessment.target,
        observation.session,
        observation.assessment.capabilities,
        inventory.inventory,
        false
      );
      return assessment.facts;
    });

  /**
   * Applies one final-preflight mutation plan through the retained session.
   *
   * Every command is immediately reobserved. Confirmed operations form an
   * exact prefix; an uncertain command remains outside that prefix.
   */
  const mutateTarget = (
    content: SelectedContent,
    observation: Extract<NativeTargetObservation, { kind: "Available" }>
  ): Effect.Effect<ProviderMutationTargetResult> =>
    Effect.gen(function* () {
      const { assessment, session } = observation;
      let inventory = assessment.inventory;
      const operations: ConfirmedNativeOperation[] = [];
      const issues: ProviderIssue[] = [];

      const executeCommand = (
        operation: ConfirmedNativeOperation
      ): Effect.Effect<ReturnType<typeof classifyNativeMutationStep>, never> =>
        Effect.gen(function* () {
          let mutation: Effect.Effect<unknown, NativeAgentProviderFailure>;
          switch (operation.kind) {
            case "marketplace-added":
              mutation = session.addMarketplace(content.marketplace.source);
              break;
            case "marketplace-removed":
              mutation = session.removeMarketplace({ identity: operation.identity });
              break;
            case "plugin-installed":
              mutation = session.installPlugin({ selector: operation.selector });
              break;
            case "plugin-removed":
              mutation = session.removePlugin({ selector: operation.selector });
              break;
            case "plugin-enabled":
              if (session.provider !== "claude") {
                return {
                  kind: "Failed" as const,
                  issue: providerIssue(
                    "CapabilityMissing",
                    "Codex did not expose plugin enablement."
                  ),
                };
              }
              mutation = session.enablePlugin({ selector: operation.selector });
              break;
          }
          const command = yield* Effect.result(mutation);
          const observed = yield* observeInventory(session, assessment.target);
          return classifyNativeMutationStep(
            content,
            operation,
            Result.isFailure(command)
              ? {
                  kind: "Failed",
                  commandPhase: command.failure.commandPhase,
                  detail: command.failure.detail,
                }
              : { kind: "Returned" },
            observed
          );
        });

      for (const plan of planNativeTargetMutation(content, assessment, nativePolicy)) {
        switch (plan.kind) {
          case "GuardMarketplaceRemoval": {
            const observed = yield* observeInventory(session, assessment.target);
            if (observed.kind === "Failed") {
              return failedMutationTarget(assessment, operations, Object.freeze([]), [
                ...issues,
                providerIssue(
                  "NativeObservationFailed",
                  `Marketplace could not be reobserved before removal: ${observed.detail}`
                ),
              ]);
            }
            inventory = observed.inventory;
            const ownershipIssue = marketplaceRemovalIssue(content, inventory);
            if (ownershipIssue !== undefined) {
              return failedMutationTarget(assessment, operations, Object.freeze([]), [
                ...issues,
                ownershipIssue,
              ]);
            }
            break;
          }
          case "VerifyMember": {
            const verified = yield* assessPluginFilePlan(session, plan.plan);
            if (!verified.matches) {
              return failedMutationTarget(
                assessment,
                operations,
                yield* observeTerminalFacts(content, observation),
                [...issues, ...verified.issues]
              );
            }
            break;
          }
          case "RetireOmitted":
            return failedMutationTarget(
              assessment,
              operations,
              yield* observeTerminalFacts(content, observation),
              [
                ...issues,
                providerIssue(
                  "DesiredContentInvalid",
                  "Disposable provider testing cannot retire omitted plugins."
                ),
              ]
            );
          case "Command": {
            if (!nativeCommandIsRequired(plan, inventory)) break;
            const step = yield* executeCommand(plan.operation);
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
            inventory = step.inventory;
            if (step.kind === "Confirmed") operations.push(plan.operation);
            break;
          }
        }
      }

      const finalInventory = yield* observeInventory(session, assessment.target);
      if (finalInventory.kind === "Failed") {
        return failedMutationTarget(assessment, operations, Object.freeze([]), [
          ...issues,
          providerIssue(
            "NativeObservationFailed",
            `Final provider state could not be observed: ${finalInventory.detail}`
          ),
        ]);
      }
      const finalAssessment = yield* assessInventory(
        content,
        assessment.target,
        session,
        assessment.capabilities,
        finalInventory.inventory,
        false
      );
      const finalIssue = finalNativeAssessmentIssue(finalAssessment);
      return finalIssue === undefined
        ? completedMutationTarget(assessment, operations, finalAssessment.facts, issues)
        : failedMutationTarget(assessment, operations, finalAssessment.facts, [
            ...issues,
            ...finalAssessment.issues,
            finalIssue,
          ]);
    });

  const selected = yield* selectWorkspace();
  if (selected.kind === "Rejected") {
    return {
      operation: "test",
      classification: "Blocked",
      selection: null,
      targets: rejectedTargets(canonicalRequest.targets, selected.issues),
      issues: selected.issues,
    } satisfies ProviderTestResult;
  }
  const initial = yield* observeTargets(selected.content, canonicalRequest.targets, true);
  const initialAssessments = Object.freeze(initial.map(({ assessment }) => assessment));
  if (hasBlockingAssessment(initialAssessments)) {
    return completedProviderTestResult(selected.content, blockedTargetResults(initialAssessments));
  }
  if (allTargetsConverged(initialAssessments)) {
    return completedProviderTestResult(
      selected.content,
      Object.freeze(initialAssessments.map(convergedMutationTargetResult))
    );
  }

  const revalidated = yield* selectWorkspace();
  if (
    revalidated.kind === "Rejected" ||
    !sameSelectedContent(selected.content, revalidated.content)
  ) {
    return blockedProviderTestResult(
      selected.content,
      sourceChangedTargets(canonicalRequest.targets)
    );
  }
  const finalPreflight = yield* observeTargets(revalidated.content, canonicalRequest.targets, true);
  const finalAssessments = Object.freeze(finalPreflight.map(({ assessment }) => assessment));
  if (hasBlockingAssessment(finalAssessments)) {
    return completedProviderTestResult(revalidated.content, blockedTargetResults(finalAssessments));
  }
  if (allTargetsConverged(finalAssessments)) {
    return completedProviderTestResult(
      revalidated.content,
      Object.freeze(finalAssessments.map(convergedMutationTargetResult))
    );
  }

  const targets: ProviderMutationTargetResult[] = [];
  for (const [index, observation] of finalPreflight.entries()) {
    if (observation.kind === "Unavailable") {
      targets.push(
        failedMutationTarget(observation.assessment, [], [], observation.assessment.issues)
      );
      targets.push(...notAttemptedAfterMutation(finalAssessments.slice(index + 1)));
      break;
    }
    const target = observation.assessment.needsMutation
      ? yield* mutateTarget(revalidated.content, observation)
      : convergedMutationTargetResult(observation.assessment);
    targets.push(target);
    if (target.classification === "Failed" || target.classification === "Uncertain") {
      targets.push(...notAttemptedAfterMutation(finalAssessments.slice(index + 1)));
      break;
    }
  }
  return completedProviderTestResult(revalidated.content, Object.freeze(targets));
});
