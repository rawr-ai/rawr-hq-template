import {
  EXPORT_OWNER,
  EXPORT_OWNER_PROTOCOL_VERSION,
  classifyExportOwnerReplay,
  classifyExportOwnerStaged,
  inspectExportOwnerAction,
  parseExportOwnerAction,
  parseExportOwnerObservedPost,
  selectExportOwnerTargetBindings,
  validateExportOwnerActionSequence,
  verifyExportOwnerPrior,
  type ExportFailure,
  type ExportFailureSet,
  type ExportInverseActionV1,
  type UndoApplyingSession,
  type UndoWriter,
} from "@rawr/agent-plugin-lifecycle/ports/exports";
import {
  executeExportInverseAction,
  nodeExportOwnerStateReader,
  type ExecuteExportInverseOptions,
} from "../service-runtime/exports/runtime";

import type {
  CapsuleActionHandle,
  CapsuleFailure,
  CapsuleUndoWriterV1,
  OwnerProtocolRegistrationV1,
} from "./contract";
import {
  ClosedOwnerProtocolRegistryV1,
  eraseOwnerProtocolRegistrationV1,
} from "./protocol-registry";

export function createExportOwnerProtocolRegistrationV1(
  options: ExecuteExportInverseOptions = {},
): OwnerProtocolRegistrationV1 {
  const registration: OwnerProtocolRegistrationV1<ExportInverseActionV1, ReturnType<typeof parseExportOwnerObservedPost>> = {
    codec: {
      owner: EXPORT_OWNER,
      protocolVersion: EXPORT_OWNER_PROTOCOL_VERSION,
      parseAction: parseExportOwnerAction,
      encodeAction: (action) => action,
      inspectAction: inspectExportOwnerAction,
      parseObservedPost: parseExportOwnerObservedPost,
      encodeObservedPost: (_action, observedPost) => observedPost,
      validateActionSequence: ({ actions, mode }) =>
        validateExportOwnerActionSequence({ actions, mode }),
      selectTargetBindings: ({ bindings, actions }) =>
        selectExportOwnerTargetBindings({ bindings, actions }),
    },
    applyingRecovery: {
      owner: EXPORT_OWNER,
      protocolVersion: EXPORT_OWNER_PROTOCOL_VERSION,
      async classifyStaged({ action, targets }) {
        const classification = await classifyExportOwnerStaged({
          action,
          targets,
          state: nodeExportOwnerStateReader,
        });
        return classification.kind === "Ambiguous"
          ? Object.freeze({ kind: "Ambiguous", failure: toCapsuleFailure(classification.failure) })
          : classification;
      },
    },
    replay: {
      owner: EXPORT_OWNER,
      protocolVersion: EXPORT_OWNER_PROTOCOL_VERSION,
      async classify({ action, observedPost, targets }) {
        const classification = await classifyExportOwnerReplay({
          action,
          observedPost,
          targets,
          state: nodeExportOwnerStateReader,
        });
        return classification.kind === "Ambiguous"
          ? Object.freeze({ kind: "Ambiguous", failure: toCapsuleFailure(classification.failure) })
          : classification;
      },
      async restore({ action, observedPost, targets }) {
        try {
          selectExportOwnerTargetBindings({ bindings: targets, actions: [action] });
          const result = await executeExportInverseAction(action, observedPost, options);
          if (result.kind === "RevertedVerified") return Object.freeze({ kind: "Restored" });
          if (result.kind === "ReadOnlyConverged") return Object.freeze({ kind: "AlreadyRestored" });
          if (result.kind === "Invalid") {
            return Object.freeze({ kind: "Blocked", failure: toCapsuleFailure(result.failure) });
          }
          const primary = result.failures.primary;
          const ownerFailure = toCapsuleFailure(
            primary,
            result.failures.kind === "PrimaryAndCleanup" ? result.failures : undefined,
          );
          return isOperationalReplayFailure(primary)
            ? Object.freeze({ kind: "Failed", failure: ownerFailure })
            : Object.freeze({ kind: "Blocked", failure: ownerFailure });
        } catch (error) {
          return Object.freeze({
            kind: "Blocked",
            failure: capsuleFailure(
              "ReplayBlocked",
              "export-owner-restore",
              error instanceof Error ? error.message : String(error),
            ),
          });
        }
      },
      async verifyPrior({ actions, targets }) {
        const verification = await verifyExportOwnerPrior({
          actions: actions.map(({ action, observedPost }) => Object.freeze({ action, observedPost })),
          targets,
          state: nodeExportOwnerStateReader,
        });
        return verification.kind === "Verified"
          ? verification
          : Object.freeze({ kind: "Blocked", failure: toCapsuleFailure(verification.failure) });
      },
    },
  };
  return eraseOwnerProtocolRegistrationV1(registration);
}

export function createAgentPluginOwnerProtocolRegistryV1(
  options: ExecuteExportInverseOptions = {},
  providerRegistration?: OwnerProtocolRegistrationV1,
): ClosedOwnerProtocolRegistryV1 {
  return new ClosedOwnerProtocolRegistryV1([
    createExportOwnerProtocolRegistrationV1(options),
    ...(providerRegistration === undefined ? [] : [providerRegistration]),
  ]);
}

export function createExportUndoWriterV1(controller: CapsuleUndoWriterV1): UndoWriter {
  const writer: UndoWriter = {
    preflight: (input) => controller.preflight(input),
    async begin(input) {
      const result = await controller.begin(input);
      if (result.kind !== "Accepted") return result;
      const session: UndoApplyingSession = Object.freeze({
        stage: ({ actionHandle }: Parameters<UndoApplyingSession["stage"]>[0]) => result.session.stage({
          actionHandle: actionHandle as CapsuleActionHandle,
        }),
        discardStaged: ({ actionHandle }: Parameters<UndoApplyingSession["discardStaged"]>[0]) =>
          result.session.discardStaged({
          actionHandle: actionHandle as CapsuleActionHandle,
        }),
        markApplied: ({ actionHandle, observedPost }: Parameters<UndoApplyingSession["markApplied"]>[0]) =>
          result.session.markApplied({
          actionHandle: actionHandle as CapsuleActionHandle,
          observedPost,
        }),
        settle: () => result.session.settle(),
        abort: () => result.session.abort(),
        suspend: () => result.session.suspend(),
      });
      return Object.freeze({
        kind: "Accepted",
        generation: result.generation,
        admittedActions: result.admittedActions,
        session,
      });
    },
  };
  return Object.freeze(writer);
}

function toCapsuleFailure(
  source: ExportFailure,
  failureSet?: Extract<ExportFailureSet, { kind: "PrimaryAndCleanup" }>,
): CapsuleFailure {
  const code = isOperationalReplayFailure(source) ? "ReplayFailed" : "ReplayBlocked";
  return Object.freeze({
    code,
    phase: `export:${source.phase}`,
    message: source.message,
    ...(source.path === undefined ? {} : { path: source.path }),
    ...(failureSet === undefined ? {} : {
      cleanup: Object.freeze({
        code: failureSet.cleanup.code === "TemporaryCleanupBlocked"
          ? "TemporaryCleanupBlocked" as const
          : "TemporaryCleanupFailed" as const,
        message: failureSet.cleanup.message,
        path: failureSet.cleanup.path ?? "<unknown-export-temporary>",
      }),
    }),
  });
}

function isOperationalReplayFailure(failure: ExportFailure): boolean {
  return failure.code === "MutationFailed"
    || failure.code === "VerificationFailed"
    || failure.code === "TemporaryCreateFailed"
    || failure.code === "TemporaryWriteFailed"
    || failure.code === "TemporaryVerifyFailed"
    || failure.code === "TemporaryCleanupFailed"
    || failure.code === "LedgerCommitFailed"
    || failure.code === "FailpointFailed";
}

function capsuleFailure(
  code: CapsuleFailure["code"],
  phase: string,
  message: string,
): CapsuleFailure {
  return Object.freeze({ code, phase, message });
}
