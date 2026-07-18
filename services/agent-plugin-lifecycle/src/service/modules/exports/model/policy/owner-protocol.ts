import { compareCanonicalText } from "../../../../shared/release/index";

import { bytesEqual } from "../helpers/canonical";
import type { ExportFailure } from "../dto/export-lifecycle";
import {
  ExportFilesystemError,
  failure,
  visibleDirectoryMode,
  visibleFileMode,
  type CapturedDirectory,
  type CapturedPath,
  type CapturedRegularFile,
  type DestinationIdentity,
} from "../dto/filesystem";
import {
  EXPORT_APPLIED_OBSERVATION_PROTOCOL_VERSION,
  exportInverseActionDigest,
  fileStateBytes,
  verifyExportAppliedObservation,
  verifyExportInverseAction,
  type ExportAppliedObservationV1,
  type ExportDirectoryPriorStateV1,
  type ExportFileStateV1,
  type ExportInverseActionV1,
  type ExportObservedEntryStateV1,
} from "./inverse-action";
import {
  EXPORT_LEDGER_FILENAME,
  initialExportLedger,
  ledgerScope,
  verifyExportLedgerBytes,
  type ExportLedgerV1,
} from "./ledger";
import { validateExportOwnerActionSequence } from "./owner-sequence";

export const EXPORT_OWNER = "agent-plugin-export" as const;
export const EXPORT_OWNER_PROTOCOL_VERSION = 1 as const;
export const MAX_EXPORT_OWNER_OBSERVATION_BYTES = 32 * 1024;

export interface ExportOwnerTargetBindingV1 {
  readonly canonicalTarget: string;
  readonly authorityGeneration: string;
  readonly authorityDigest: string;
}

export interface ExportOwnerActionInspectionV1 {
  readonly actionType: "ExportInverseActionV1";
  readonly relativePaths: readonly string[];
  readonly decodedPriorBytes: number;
  readonly maximumObservedPostBytes: number;
}

export type ExportOwnerStagedClassificationV1 =
  | Readonly<{ kind: "NotApplied" }>
  | Readonly<{ kind: "Ambiguous"; failure: ExportFailure }>;

export type ExportOwnerReplayClassificationV1 =
  | Readonly<{ kind: "ExpectedPost"; observedPost: ExportAppliedObservationV1 }>
  | Readonly<{ kind: "Prior" }>
  | Readonly<{ kind: "Ambiguous"; failure: ExportFailure }>;

export type ExportOwnerPriorVerificationV1 =
  | Readonly<{ kind: "Verified" }>
  | Readonly<{ kind: "Blocked"; failure: ExportFailure }>;

export interface ExportOwnerStateReader {
  captureDestination(input: string): Promise<DestinationIdentity>;
  captureDirectFile(
    destination: DestinationIdentity,
    filename: string,
    maximumReadableBytes?: number,
  ): Promise<CapturedPath>;
  capturePath(
    destination: DestinationIdentity,
    relativePath: string,
    maximumReadableBytes?: number,
  ): Promise<CapturedPath>;
  captureExistingDirectory(
    destination: DestinationIdentity,
    relativePath: string,
  ): Promise<CapturedDirectory>;
}

type LiveEntry =
  | Readonly<{ kind: "Absent"; captured: Extract<CapturedPath, { kind: "Absent" }> }>
  | Readonly<{ kind: "File"; file: CapturedRegularFile }>
  | Readonly<{ kind: "Directory"; directory: CapturedDirectory }>;

export function inspectExportOwnerAction(actionInput: unknown): ExportOwnerActionInspectionV1 {
  const action = parseExportOwnerAction(actionInput);
  return Object.freeze({
    actionType: "ExportInverseActionV1",
    relativePaths: Object.freeze([action.relativePath]),
    decodedPriorBytes: action.prior.kind === "Present" ? fileStateBytes(action.prior).byteLength : 0,
    maximumObservedPostBytes: MAX_EXPORT_OWNER_OBSERVATION_BYTES,
  });
}

export function parseExportOwnerAction(input: unknown): ExportInverseActionV1 {
  const verification = verifyExportInverseAction(input);
  if (!verification.ok) throw new TypeError(verification.message);
  return verification.action;
}

export function parseExportOwnerObservedPost(
  actionInput: unknown,
  input: unknown,
): ExportAppliedObservationV1 {
  return requireForwardObservation(actionInput, input);
}

export function selectExportOwnerTargetBindings(input: Readonly<{
  bindings: readonly ExportOwnerTargetBindingV1[];
  actions: readonly ExportInverseActionV1[];
}>): readonly ExportOwnerTargetBindingV1[] {
  if (input.bindings.length === 0 || input.actions.length === 0) {
    throw new Error("export owner protocol requires nonempty target bindings and actions");
  }
  const byTarget = new Map<string, ExportOwnerTargetBindingV1>();
  for (const binding of input.bindings) {
    if (byTarget.has(binding.canonicalTarget)) {
      throw new Error(`export target binding is duplicated: ${binding.canonicalTarget}`);
    }
    byTarget.set(binding.canonicalTarget, binding);
  }

  const selected = new Map<string, ExportOwnerTargetBindingV1>();
  const actionDigests = new Set<string>();
  let previousDestination: string | undefined;
  for (const actionInput of input.actions) {
    const action = parseExportOwnerAction(actionInput);
    if (
      previousDestination !== undefined
      && compareCanonicalText(previousDestination, action.canonicalDestination) > 0
    ) {
      throw new Error("export action destinations are not in canonical order");
    }
    previousDestination = action.canonicalDestination;
    const digest = exportInverseActionDigest(action);
    if (actionDigests.has(digest)) throw new Error(`export inverse action is duplicated: ${digest}`);
    actionDigests.add(digest);

    const binding = byTarget.get(action.canonicalDestination);
    if (binding === undefined) {
      throw new Error(`export action has no target binding: ${action.canonicalDestination}`);
    }
    assertActionTargetBinding(action, binding);
    selected.set(binding.canonicalTarget, binding);
  }
  return Object.freeze([...selected.values()].sort((left, right) =>
    compareCanonicalText(left.canonicalTarget, right.canonicalTarget)));
}

export async function classifyExportOwnerStaged(input: Readonly<{
  action: ExportInverseActionV1;
  targets: readonly ExportOwnerTargetBindingV1[];
  state: ExportOwnerStateReader;
}>): Promise<ExportOwnerStagedClassificationV1> {
  try {
    const action = parseExportOwnerAction(input.action);
    requireSingleActionTarget(action, input.targets);
    const destination = await input.state.captureDestination(action.canonicalDestination);
    const ledger = await captureLedger(input.state, destination, action.layout);
    const live = await inspectLiveEntry(input.state, destination, action);
    if (matchesStagedPrior(live, action.prior) && matchesPriorAuthority(action, ledger)) {
      return Object.freeze({ kind: "NotApplied" });
    }
    return ambiguous(
      "owner-applying-classify",
      "Staged export action no longer has its exact prior state; no applied identity was persisted",
      action.relativePath,
    );
  } catch (error) {
    return Object.freeze({
      kind: "Ambiguous",
      failure: classificationFailure(error, "owner-applying-classify", input.action.relativePath),
    });
  }
}

export async function classifyExportOwnerReplay(input: Readonly<{
  action: ExportInverseActionV1;
  observedPost: ExportAppliedObservationV1;
  targets: readonly ExportOwnerTargetBindingV1[];
  state: ExportOwnerStateReader;
}>): Promise<ExportOwnerReplayClassificationV1> {
  try {
    const action = parseExportOwnerAction(input.action);
    const observedPost = requireForwardObservation(action, input.observedPost);
    requireSingleActionTarget(action, input.targets);
    const destination = await input.state.captureDestination(action.canonicalDestination);
    const ledger = await captureLedger(input.state, destination, action.layout);
    const live = await inspectLiveEntry(input.state, destination, action);

    if (
      matchesObservation(live, observedPost.observedPost)
      && matchesForwardAuthority(action, ledger)
    ) {
      return Object.freeze({ kind: "ExpectedPost", observedPost });
    }
    if (matchesReplayPrior(live, action.prior) && matchesPriorAuthority(action, ledger)) {
      return Object.freeze({ kind: "Prior" });
    }
    return ambiguous(
      "owner-replay-classify",
      "Live export state matches neither the committed post-state nor the action prior state",
      action.relativePath,
    );
  } catch (error) {
    return Object.freeze({
      kind: "Ambiguous",
      failure: classificationFailure(error, "owner-replay-classify", input.action.relativePath),
    });
  }
}

export async function verifyExportOwnerPrior(input: Readonly<{
  actions: readonly Readonly<{
    action: ExportInverseActionV1;
    observedPost: ExportAppliedObservationV1;
  }>[];
  targets: readonly ExportOwnerTargetBindingV1[];
  state: ExportOwnerStateReader;
}>): Promise<ExportOwnerPriorVerificationV1> {
  try {
    const actions = input.actions.map(({ action, observedPost }) => Object.freeze({
      action: parseExportOwnerAction(action),
      observedPost: requireForwardObservation(action, observedPost),
    }));
    validateExportOwnerActionSequence({
      actions: actions.map(({ action }) => action),
      mode: "applied-prefix",
    });
    const selectedTargets = selectExportOwnerTargetBindings({
      bindings: input.targets,
      actions: actions.map(({ action }) => action),
    });
    if (!sameBindings(selectedTargets, input.targets)) {
      throw new Error("export prior verification actions do not exhaust their target bindings");
    }

    const destinations = new Map<string, Readonly<{
      identity: DestinationIdentity;
      ledger: ExportLedgerV1;
    }>>();
    for (const { action } of actions) {
      let captured = destinations.get(action.canonicalDestination);
      if (captured === undefined) {
        const identity = await input.state.captureDestination(action.canonicalDestination);
        captured = Object.freeze({
          identity,
          ledger: await captureLedger(input.state, identity, action.layout),
        });
        destinations.set(action.canonicalDestination, captured);
      }
      assertPriorAuthority(action, captured.ledger);
      const live = await inspectLiveEntry(input.state, captured.identity, action);
      if (!matchesReplayPrior(live, action.prior)) {
        return Object.freeze({
          kind: "Blocked",
          failure: failure(
            "InverseStateMismatch",
            "owner-prior-verify",
            "Restored export path does not match its action prior state",
            action.relativePath,
          ),
        });
      }
    }
    return Object.freeze({ kind: "Verified" });
  } catch (error) {
    return Object.freeze({
      kind: "Blocked",
      failure: classificationFailure(error, "owner-prior-verify"),
    });
  }
}

function requireForwardObservation(
  actionInput: unknown,
  input: unknown,
): ExportAppliedObservationV1 {
  const action = parseExportOwnerAction(actionInput);
  const verification = verifyExportAppliedObservation(input);
  if (!verification.ok) throw new TypeError(verification.message);
  const observation = verification.observation;
  if (
    observation.protocolVersion !== EXPORT_APPLIED_OBSERVATION_PROTOCOL_VERSION
    || observation.phase !== "forward"
    || observation.actionDigest !== exportInverseActionDigest(action)
    || !observationMatchesExpectedState(observation.observedPost, action.expectedPost)
  ) {
    throw new TypeError("export observation does not bind the action forward state");
  }
  return observation;
}

function requireSingleActionTarget(
  action: ExportInverseActionV1,
  targets: readonly ExportOwnerTargetBindingV1[],
): ExportOwnerTargetBindingV1 {
  const selected = selectExportOwnerTargetBindings({ bindings: targets, actions: [action] });
  if (selected.length !== 1) throw new Error("export action must select exactly one destination target");
  return selected[0]!;
}

function assertActionTargetBinding(
  action: ExportInverseActionV1,
  binding: ExportOwnerTargetBindingV1,
): void {
  if (
    binding.authorityGeneration !== `elg1_${action.ledgerGeneration}`
    || binding.authorityDigest !== action.ledgerDigest
  ) {
    throw new Error(`export target authority does not bind action prior ledger: ${action.canonicalDestination}`);
  }
  if (
    action.mutation === "write-ledger"
    && (
      action.authority.kind !== "destination-ledger"
      || action.authority.nextGeneration !== action.ledgerGeneration + 1
    )
  ) {
    throw new Error("export ledger action does not bind the immediate next generation");
  }
}

async function captureLedger(
  state: ExportOwnerStateReader,
  destination: DestinationIdentity,
  layout: ExportInverseActionV1["layout"],
): Promise<ExportLedgerV1> {
  const slot = await state.captureDirectFile(destination, EXPORT_LEDGER_FILENAME);
  if (slot.kind === "Absent") return initialExportLedger(destination.path, layout);
  if (visibleFileMode(slot.file) !== 0o644) throw new Error("export ledger mode is not canonical");
  const verified = verifyExportLedgerBytes(slot.file.bytes, destination.path);
  if (!verified.ok || verified.ledger.body.layout !== layout) {
    throw new Error(verified.ok ? "export ledger layout differs from the action" : verified.message);
  }
  return verified.ledger;
}

function assertPriorAuthority(action: ExportInverseActionV1, ledger: ExportLedgerV1): void {
  if (!matchesPriorAuthority(action, ledger)) {
    throw new Error("live destination does not match the action prior authority");
  }
}

function matchesPriorAuthority(action: ExportInverseActionV1, ledger: ExportLedgerV1): boolean {
  return ledger.body.generation === action.ledgerGeneration
    && ledger.ledgerDigest === action.ledgerDigest
    && ledger.body.layout === action.layout
    && matchesPluginAuthority(action, ledger);
}

function matchesForwardAuthority(action: ExportInverseActionV1, ledger: ExportLedgerV1): boolean {
  if (action.mutation !== "write-ledger") return matchesPriorAuthority(action, ledger);
  return action.authority.kind === "destination-ledger"
    && action.authority.nextGeneration === action.ledgerGeneration + 1
    && ledger.body.generation === action.authority.nextGeneration
    && ledger.body.layout === action.layout;
}

function matchesPluginAuthority(action: ExportInverseActionV1, ledger: ExportLedgerV1): boolean {
  if (action.authority.kind === "destination-ledger") return action.mutation === "write-ledger";
  const scope = ledgerScope(ledger, action.authority.pluginId);
  if (action.authority.kind === "plugin-claim") {
    if (scope === undefined || scope.releaseDigest !== action.authority.releaseDigest) return false;
    return action.mutation === "create-directory" || action.mutation === "retire-directory"
      ? scope.directories.includes(action.relativePath)
      : scope.files.some((file) => file.relativePath === action.relativePath);
  }
  return !ledger.body.scopes.some((candidate) =>
    candidate.files.some((file) => file.relativePath === action.relativePath)
    || candidate.directories.includes(action.relativePath));
}

async function inspectLiveEntry(
  state: ExportOwnerStateReader,
  destination: DestinationIdentity,
  action: ExportInverseActionV1,
): Promise<LiveEntry> {
  try {
    const captured = await state.capturePath(destination, action.relativePath, maximumFileStateBytes(action));
    return captured.kind === "Absent"
      ? Object.freeze({ kind: "Absent", captured })
      : Object.freeze({ kind: "File", file: captured.file });
  } catch (fileError) {
    try {
      const directory = await state.captureExistingDirectory(destination, action.relativePath);
      return Object.freeze({ kind: "Directory", directory });
    } catch {
      throw fileError;
    }
  }
}

function maximumFileStateBytes(action: ExportInverseActionV1): number {
  let maximum = 1;
  for (const state of [action.prior, action.expectedPost]) {
    if (state.kind === "Present") maximum = Math.max(maximum, fileStateBytes(state).byteLength);
  }
  return maximum;
}

function matchesStagedPrior(
  live: LiveEntry,
  prior: ExportFileStateV1 | ExportDirectoryPriorStateV1,
): boolean {
  if (prior.kind === "Absent") return live.kind === "Absent";
  if (prior.kind === "Present") return live.kind === "File" && fileMatchesState(live.file, prior);
  return live.kind === "Directory"
    && visibleDirectoryMode(live.directory) === prior.mode
    && live.directory.dev.toString(10) === prior.dev
    && live.directory.ino.toString(10) === prior.ino
    && live.directory.birthtimeNs.toString(10) === prior.birthtimeNs;
}

function matchesReplayPrior(
  live: LiveEntry,
  prior: ExportFileStateV1 | ExportDirectoryPriorStateV1,
): boolean {
  if (prior.kind === "Absent") return live.kind === "Absent";
  if (prior.kind === "Present") return live.kind === "File" && fileMatchesState(live.file, prior);
  return live.kind === "Directory" && visibleDirectoryMode(live.directory) === prior.mode;
}

function fileMatchesState(
  file: CapturedRegularFile,
  state: Extract<ExportFileStateV1, { kind: "Present" }>,
): boolean {
  return visibleFileMode(file) === state.mode
    && file.contentDigest === state.contentDigest
    && bytesEqual(file.bytes, fileStateBytes(state));
}

function matchesObservation(live: LiveEntry, observed: ExportObservedEntryStateV1): boolean {
  if (observed.kind === "Absent") return live.kind === "Absent";
  if (observed.kind === "Directory") {
    return live.kind === "Directory"
      && visibleDirectoryMode(live.directory) === observed.mode
      && live.directory.dev.toString(10) === observed.dev
      && live.directory.ino.toString(10) === observed.ino
      && live.directory.birthtimeNs.toString(10) === observed.birthtimeNs;
  }
  return live.kind === "File"
    && visibleFileMode(live.file) === observed.mode
    && live.file.dev.toString(10) === observed.dev
    && live.file.ino.toString(10) === observed.ino
    && live.file.size.toString(10) === observed.size
    && live.file.mtimeNs.toString(10) === observed.mtimeNs
    && live.file.ctimeNs.toString(10) === observed.ctimeNs
    && live.file.contentDigest === observed.contentDigest;
}

function observationMatchesExpectedState(
  observed: ExportObservedEntryStateV1,
  expected: ExportFileStateV1 | Readonly<{ kind: "Absent" }> | Readonly<{ kind: "Directory"; mode: number }>,
): boolean {
  if (expected.kind === "Absent") return observed.kind === "Absent";
  if (expected.kind === "Directory") {
    return observed.kind === "Directory" && observed.mode === expected.mode;
  }
  return observed.kind === "File"
    && observed.mode === expected.mode
    && observed.contentDigest === expected.contentDigest;
}

function sameBindings(
  left: readonly ExportOwnerTargetBindingV1[],
  right: readonly ExportOwnerTargetBindingV1[],
): boolean {
  return left.length === right.length && left.every((binding, index) => {
    const peer = right[index];
    return peer !== undefined
      && binding.canonicalTarget === peer.canonicalTarget
      && binding.authorityGeneration === peer.authorityGeneration
      && binding.authorityDigest === peer.authorityDigest;
  });
}

function ambiguous(
  phase: string,
  message: string,
  path?: string,
): Extract<ExportOwnerReplayClassificationV1, { kind: "Ambiguous" }> {
  return Object.freeze({
    kind: "Ambiguous",
    failure: failure("InverseStateMismatch", phase, message, path),
  });
}

function classificationFailure(error: unknown, phase: string, path?: string): ExportFailure {
  if (error instanceof ExportFilesystemError) return error.failure;
  return failure(
    "InverseAuthorityMismatch",
    phase,
    error instanceof Error ? error.message : String(error),
    path,
  );
}
