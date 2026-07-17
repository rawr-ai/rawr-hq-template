import { posix } from "node:path";

import type {
  ExportDestinationAsyncPort,
  ExportDestinationCapture,
  ExportDestinationEntryObservation,
  ExportDestinationFailure as ExportDestinationResourceFailure,
  ExportDestinationMutation,
} from "@rawr/resource-agent-plugin-export-destination";

import {
  compareCanonicalText,
  contentDigest,
  type PluginId,
} from "../../../shared/release/index";
import { bytesEqual, jsonLine, sha256 } from "./canonical";
import type {
  ExportFailure,
  ExportLayoutV1,
  ExportOverwritePolicyV1,
} from "./contract";
import { failure } from "./filesystem-model";
import type { PlannedExportFile, RenderedExportSelection } from "./layout";
import {
  EXPORT_LEDGER_FILENAME,
  canonicalSerializeExportLedger,
  createExportLedger,
  initialExportLedger,
  verifyExportLedgerBytes,
  type ExportLedgerV1,
  type LedgerFileClaimV1,
  type LedgerPluginScopeV1,
} from "./ledger";

const MAX_DESTINATION_CAPTURE_ENTRIES = 1_000_000;
const MAX_DESTINATION_CAPTURE_BYTES = 1024 * 1024 * 1024;

export type CapturedExportFile = Extract<ExportDestinationEntryObservation, { kind: "File" }>;
export type CapturedExportDirectory = Extract<ExportDestinationEntryObservation, { kind: "Directory" }>;

export interface CapturedLedgerState {
  readonly slot: ExportDestinationEntryObservation;
  readonly ledger: ExportLedgerV1;
  readonly persisted: boolean;
}

export interface PlannedPayloadWrite {
  readonly file: PlannedExportFile;
  readonly prior: ExportDestinationEntryObservation;
  readonly authority: "plugin-claim" | "planned-adoption";
  readonly authorityReleaseDigest: LedgerPluginScopeV1["releaseDigest"];
  readonly createdDirectories: readonly string[];
}

export interface PlannedPayloadRetirement {
  readonly pluginId: PluginId;
  readonly releaseDigest: LedgerPluginScopeV1["releaseDigest"];
  readonly claim: LedgerFileClaimV1;
  readonly prior: CapturedExportFile;
  readonly removableDirectories: readonly string[];
}

export interface PlannedDirectoryRetirement {
  readonly pluginId: PluginId;
  readonly releaseDigest: LedgerPluginScopeV1["releaseDigest"];
  readonly relativePath: string;
  readonly prior: CapturedExportDirectory;
}

export interface DestinationExportPlan {
  readonly destination: Readonly<{ path: string }>;
  readonly capture: ExportDestinationCapture;
  readonly current: CapturedLedgerState;
  readonly nextLedger: ExportLedgerV1;
  readonly nextLedgerBytes: Uint8Array;
  readonly writes: readonly PlannedPayloadWrite[];
  readonly retirements: readonly PlannedPayloadRetirement[];
  readonly directoryRetirements: readonly PlannedDirectoryRetirement[];
  readonly verifiedPaths: readonly string[];
  readonly preservedPaths: readonly string[];
  readonly mutations: readonly ExportDestinationMutation[];
  readonly planDigest: string;
  readonly ledgerChange: boolean;
  readonly converged: boolean;
}

export type DestinationPlanningResult =
  | Readonly<{ ok: true; plan: DestinationExportPlan }>
  | Readonly<{ ok: false; failure: ExportFailure }>;

export async function buildDestinationExportPlan(input: Readonly<{
  destination: string;
  layout: ExportLayoutV1;
  selection: Exclude<RenderedExportSelection, { ok: false }>;
  overwritePolicy: ExportOverwritePolicyV1;
  readToken: string;
  resource: ExportDestinationAsyncPort;
}>): Promise<DestinationPlanningResult> {
  let capture: ExportDestinationCapture | undefined;
  try {
    const inspected = await input.resource.inspect({
      destination: input.destination,
      readToken: input.readToken,
      paths: [EXPORT_LEDGER_FILENAME],
      maxEntries: 2,
      maxBytes: MAX_DESTINATION_CAPTURE_BYTES,
    });
    const inspectedLedger = readLedger(inspected.entries[0], inspected.canonicalDestination, input.layout);
    const paths = capturePaths(inspectedLedger.ledger, input.selection);
    capture = await input.resource.capture({
      destination: inspected.canonicalDestination,
      readToken: input.readToken,
      paths,
      maxEntries: MAX_DESTINATION_CAPTURE_ENTRIES,
      maxBytes: MAX_DESTINATION_CAPTURE_BYTES,
    });
    const entries = new Map(capture.entries.map((entry) => [entry.path, entry]));
    const current = readLedger(entries.get(EXPORT_LEDGER_FILENAME), capture.canonicalDestination, input.layout);
    const planning = !sameLedgerObservation(inspectedLedger.slot, current.slot)
      ? blocked("PathChanged", "ledger-capture", "Destination ledger changed between inspection and capture", EXPORT_LEDGER_FILENAME)
      : planCapturedDestination(capture, current, entries, input.selection, input.overwritePolicy);
    return planning.ok
      ? planning
      : releaseRejectedCapture(input.resource, capture, planning);
  } catch (error) {
    const rejection = resourceBlocked(error, "destination-capture");
    return capture === undefined
      ? rejection
      : releaseRejectedCapture(input.resource, capture, rejection);
  }
}

async function releaseRejectedCapture(
  resource: ExportDestinationAsyncPort,
  capture: ExportDestinationCapture,
  rejection: Extract<DestinationPlanningResult, { ok: false }>,
): Promise<DestinationPlanningResult> {
  try {
    await resource.release({
      destination: capture.canonicalDestination,
      readToken: capture.readToken,
      captureHandle: capture.handle,
    });
    return rejection;
  } catch (error) {
    const cleanup = resourceFailure(error, "destination-release");
    return blocked(
      cleanup.code,
      cleanup.phase,
      `Planning rejected with ${rejection.failure.code}: ${rejection.failure.message}; capture release failed: ${cleanup.message}`,
      cleanup.path ?? rejection.failure.path,
    );
  }
}

function planCapturedDestination(
  capture: ExportDestinationCapture,
  current: CapturedLedgerState,
  entries: ReadonlyMap<string, ExportDestinationEntryObservation>,
  selection: Exclude<RenderedExportSelection, { ok: false }>,
  overwritePolicy: ExportOverwritePolicyV1,
): DestinationPlanningResult {
  try {
    const desiredScopes = selection.scopes.map(scopeFromPlan);
    const desiredByPlugin = new Map(desiredScopes.map((scope) => [scope.pluginId, scope]));
    const currentByPlugin = new Map(current.ledger.body.scopes.map((scope) => [scope.pluginId, scope]));
    const allCurrentClaims = new Map<string, { scope: LedgerPluginScopeV1; claim: LedgerFileClaimV1 }>();
    const liveClaims = new Map<string, CapturedExportFile>();
    for (const scope of current.ledger.body.scopes) {
      for (const claim of scope.files) {
        allCurrentClaims.set(claim.relativePath, { scope, claim });
        const observed = entries.get(claim.relativePath);
        if (
          observed?.kind !== "File"
          || observed.mode !== claim.mode
          || contentDigest(observed.bytes) !== claim.contentDigest
        ) return blocked(
          "ManagedStateMismatch",
          "managed-preflight",
          "Ledger-owned path is not one verified live file",
          claim.relativePath,
        );
        liveClaims.set(claim.relativePath, observed);
      }
    }

    const writes: PlannedPayloadWrite[] = [];
    const verifiedPaths: string[] = [];
    const assignedDirectories = new Set<string>();
    const desiredFiles = selection.scopes
      .flatMap((scope) => scope.files)
      .sort((left, right) => compareCanonicalText(left.relativePath, right.relativePath));
    for (const file of desiredFiles) {
      const prior = requireEntry(entries, file.relativePath);
      const currentClaim = allCurrentClaims.get(file.relativePath);
      if (currentClaim !== undefined) {
        const managed = liveClaims.get(file.relativePath);
        if (managed === undefined) throw new Error(`Managed capture missing for ${file.relativePath}`);
        if (
          managed.mode === file.mode
          && contentDigest(managed.bytes) === file.contentDigest
          && bytesEqual(managed.bytes, file.bytes)
        ) {
          verifiedPaths.push(file.relativePath);
          continue;
        }
        writes.push(Object.freeze({
          file,
          prior,
          authority: "plugin-claim",
          authorityReleaseDigest: currentClaim.scope.releaseDigest,
          createdDirectories: Object.freeze([]),
        }));
        continue;
      }
      if (prior.kind === "Directory") {
        return blocked("UnmanagedCollision", "collision-preflight", "Planned file path is occupied by a directory", file.relativePath);
      }
      if (prior.kind === "File" && overwritePolicy === "managed-only") {
        return blocked("UnmanagedCollision", "collision-preflight", "Unmanaged planned path is preserved under managed-only", file.relativePath);
      }
      const createdDirectories = ancestorDirectories(file.relativePath).filter((directory) => {
        const observed = requireEntry(entries, directory);
        if (observed.kind === "File") throw new Error(`Planned parent is not a directory: ${directory}`);
        if (observed.kind !== "Absent" || assignedDirectories.has(directory)) return false;
        assignedDirectories.add(directory);
        return true;
      });
      writes.push(Object.freeze({
        file,
        prior,
        authority: "planned-adoption",
        authorityReleaseDigest: file.releaseDigest,
        createdDirectories: Object.freeze(createdDirectories),
      }));
    }

    const desiredPaths = new Set(desiredFiles.map((file) => file.relativePath));
    const retirements: PlannedPayloadRetirement[] = [];
    const scopesEligibleForRetirement = selection.mode === "complete-set"
      ? current.ledger.body.scopes
      : current.ledger.body.scopes.filter((scope) => scope.pluginId === selection.scopes[0].pluginId);
    for (const scope of scopesEligibleForRetirement) {
      for (const claim of scope.files) {
        if (desiredPaths.has(claim.relativePath)) continue;
        const prior = liveClaims.get(claim.relativePath);
        if (prior === undefined) {
          return blocked("ManagedStateMismatch", "retirement-preflight", "Retirement claim is not one verified live file", claim.relativePath);
        }
        const desiredDirectories = new Set([...desiredByPlugin.values()].flatMap((candidate) => candidate.directories));
        retirements.push(Object.freeze({
          pluginId: scope.pluginId,
          releaseDigest: scope.releaseDigest,
          claim,
          prior,
          removableDirectories: Object.freeze(scope.directories.filter((directory) => !desiredDirectories.has(directory))),
        }));
      }
    }
    retirements.sort((left, right) => compareCanonicalText(left.claim.relativePath, right.claim.relativePath));

    const directoryRetirements = planDirectoryRetirements(entries, retirements);
    const nextState = nextLedgerState(current.ledger, desiredScopes, currentByPlugin, selection, writes, retirements);
    if (current.ledger.body.generation === Number.MAX_SAFE_INTEGER && nextState.changed) {
      return blocked("LedgerGenerationChanged", "ledger-generation", "Ledger generation cannot advance beyond the safe-integer bound");
    }
    const nextLedger = nextState.changed
      ? createExportLedger({
        canonicalDestination: capture.canonicalDestination,
        layout: current.ledger.body.layout,
        generation: current.ledger.body.generation + 1,
        scopes: nextState.scopes,
        completeSet: nextState.completeSet,
      })
      : current.ledger;
    const nextLedgerBytes = canonicalSerializeExportLedger(nextLedger);
    const mutations = createMutations(writes, retirements, directoryRetirements, nextState.changed, nextLedgerBytes);
    const planDigest = digestPlan(capture, current.ledger, nextLedger, mutations);
    const preservedPaths = current.ledger.body.scopes
      .filter((scope) => selection.mode === "targeted-release" && scope.pluginId !== selection.scopes[0].pluginId)
      .flatMap((scope) => scope.files.map((file) => file.relativePath))
      .sort(compareCanonicalText);
    return Object.freeze({
      ok: true,
      plan: Object.freeze({
        destination: Object.freeze({ path: capture.canonicalDestination }),
        capture,
        current,
        nextLedger,
        nextLedgerBytes,
        writes: Object.freeze(writes),
        retirements: Object.freeze(retirements),
        directoryRetirements,
        verifiedPaths: Object.freeze(verifiedPaths.sort(compareCanonicalText)),
        preservedPaths: Object.freeze(preservedPaths),
        mutations,
        planDigest,
        ledgerChange: nextState.changed,
        converged: mutations.length === 0,
      }),
    });
  } catch (error) {
    return blocked("LedgerInvalid", "destination-plan", error instanceof Error ? error.message : String(error));
  }
}

function capturePaths(
  ledger: ExportLedgerV1,
  selection: Exclude<RenderedExportSelection, { ok: false }>,
): readonly string[] {
  const paths = new Set<string>([EXPORT_LEDGER_FILENAME]);
  for (const scope of ledger.body.scopes) {
    for (const file of scope.files) paths.add(file.relativePath);
    for (const directory of scope.directories) paths.add(directory);
  }
  for (const scope of selection.scopes) {
    for (const file of scope.files) paths.add(file.relativePath);
    for (const directory of scope.directories) paths.add(directory);
  }
  return Object.freeze([...paths].sort(compareCanonicalText));
}

function readLedger(
  slot: ExportDestinationEntryObservation | undefined,
  destination: string,
  layout: ExportLayoutV1,
): CapturedLedgerState {
  if (slot === undefined) throw new Error("Destination resource omitted the ledger observation");
  if (slot.kind === "Absent") {
    return Object.freeze({ slot, ledger: initialExportLedger(destination, layout), persisted: false });
  }
  if (slot.kind !== "File") throw new Error("Destination ledger path is not a regular file");
  if (slot.mode !== 0o644) throw new Error("Ledger file mode is not canonical 0644");
  const verified = verifyExportLedgerBytes(slot.bytes, destination);
  if (!verified.ok) throw new Error(verified.message);
  if (verified.ledger.body.layout !== layout) throw new Error("Destination ledger belongs to another layout protocol");
  return Object.freeze({ slot, ledger: verified.ledger, persisted: true });
}

function sameLedgerObservation(
  left: ExportDestinationEntryObservation,
  right: ExportDestinationEntryObservation,
): boolean {
  if (left.kind !== right.kind || left.path !== right.path) return false;
  if (left.kind === "Absent" || right.kind === "Absent") return left.kind === "Absent" && right.kind === "Absent";
  return left.kind === "File"
    && right.kind === "File"
    && left.mode === right.mode
    && left.stat.dev === right.stat.dev
    && left.stat.ino === right.stat.ino
    && left.stat.mtimeNs === right.stat.mtimeNs
    && left.stat.ctimeNs === right.stat.ctimeNs
    && bytesEqual(left.bytes, right.bytes);
}

function planDirectoryRetirements(
  entries: ReadonlyMap<string, ExportDestinationEntryObservation>,
  retirements: readonly PlannedPayloadRetirement[],
): readonly PlannedDirectoryRetirement[] {
  const authority = new Map<string, Readonly<{ pluginId: PluginId; releaseDigest: LedgerPluginScopeV1["releaseDigest"] }>>();
  for (const retirement of retirements) {
    for (const relativePath of retirement.removableDirectories) {
      if (!authority.has(relativePath)) authority.set(relativePath, Object.freeze({
        pluginId: retirement.pluginId,
        releaseDigest: retirement.releaseDigest,
      }));
    }
  }
  const retiringFiles = new Set<string>(retirements.map((retirement) => retirement.claim.relativePath));
  const removableDirectories = new Set<string>();
  const planned: PlannedDirectoryRetirement[] = [];
  const candidates = [...authority.entries()].sort((left, right) =>
    right[0].split("/").length - left[0].split("/").length
    || compareCanonicalText(right[0], left[0]));
  for (const [relativePath, owner] of candidates) {
    const prior = requireEntry(entries, relativePath);
    if (prior.kind === "Absent") continue;
    if (prior.kind !== "Directory") throw new Error(`Managed directory path is not a directory: ${relativePath}`);
    const removable = prior.children.every((child) => {
      const childPath = `${relativePath}/${child.name}`;
      return retiringFiles.has(childPath) || removableDirectories.has(childPath);
    });
    if (!removable) continue;
    removableDirectories.add(relativePath);
    planned.push(Object.freeze({ ...owner, relativePath, prior }));
  }
  return Object.freeze(planned);
}

function nextLedgerState(
  current: ExportLedgerV1,
  desiredScopes: readonly LedgerPluginScopeV1[],
  currentByPlugin: ReadonlyMap<PluginId, LedgerPluginScopeV1>,
  selection: Exclude<RenderedExportSelection, { ok: false }>,
  writes: readonly PlannedPayloadWrite[],
  retirements: readonly PlannedPayloadRetirement[],
): Readonly<{
  scopes: readonly LedgerPluginScopeV1[];
  completeSet: ExportLedgerV1["body"]["completeSet"];
  changed: boolean;
}> {
  let scopes: readonly LedgerPluginScopeV1[];
  let completeSet: ExportLedgerV1["body"]["completeSet"];
  if (selection.mode === "complete-set") {
    scopes = Object.freeze(desiredScopes);
    completeSet = Object.freeze({
      releaseSetDigest: selection.releaseSetDigest,
      members: Object.freeze(desiredScopes.map((scope) => Object.freeze({
        pluginId: scope.pluginId,
        releaseDigest: scope.releaseDigest,
      }))),
    });
  } else {
    const target = desiredScopes[0]!;
    const merged = new Map(currentByPlugin);
    merged.set(target.pluginId, target);
    scopes = Object.freeze([...merged.values()].sort((left, right) => compareCanonicalText(left.pluginId, right.pluginId)));
    const currentTarget = currentByPlugin.get(target.pluginId);
    completeSet = currentTarget !== undefined
      && sameScope(currentTarget, target)
      && writes.length === 0
      && retirements.length === 0
      ? current.body.completeSet
      : null;
  }
  return Object.freeze({ scopes, completeSet, changed: !sameLedgerState(current, scopes, completeSet) });
}

function createMutations(
  writes: readonly PlannedPayloadWrite[],
  retirements: readonly PlannedPayloadRetirement[],
  directoryRetirements: readonly PlannedDirectoryRetirement[],
  ledgerChange: boolean,
  nextLedgerBytes: Uint8Array,
): readonly ExportDestinationMutation[] {
  const mutations: ExportDestinationMutation[] = [];
  const created = new Set<string>();
  for (const write of writes) {
    for (const directory of write.createdDirectories) {
      if (created.has(directory)) continue;
      created.add(directory);
      mutations.push(Object.freeze({ kind: "EnsureDirectory", path: directory, mode: 0o755 }));
    }
    mutations.push(Object.freeze({ kind: "WriteFile", path: write.file.relativePath, mode: write.file.mode, bytes: write.file.bytes }));
  }
  for (const retirement of retirements) mutations.push(Object.freeze({ kind: "RemoveFile", path: retirement.claim.relativePath }));
  for (const retirement of directoryRetirements) mutations.push(Object.freeze({ kind: "RemoveEmptyDirectory", path: retirement.relativePath }));
  if (ledgerChange) mutations.push(Object.freeze({ kind: "WriteFile", path: EXPORT_LEDGER_FILENAME, mode: 0o644, bytes: nextLedgerBytes }));
  return Object.freeze(mutations);
}

function digestPlan(
  capture: ExportDestinationCapture,
  current: ExportLedgerV1,
  next: ExportLedgerV1,
  mutations: readonly ExportDestinationMutation[],
): string {
  return sha256("edp1_", jsonLine({
    canonicalDestination: capture.canonicalDestination,
    readToken: capture.readToken,
    currentLedgerDigest: current.ledgerDigest,
    nextLedgerDigest: next.ledgerDigest,
    mutations: mutations.map((mutation) => mutation.kind === "WriteFile"
      ? { kind: mutation.kind, path: mutation.path, mode: mutation.mode, contentDigest: contentDigest(mutation.bytes) }
      : mutation),
  }));
}

function scopeFromPlan(scope: Exclude<RenderedExportSelection, { ok: false }>["scopes"][number]): LedgerPluginScopeV1 {
  return Object.freeze({
    pluginId: scope.pluginId,
    releaseDigest: scope.releaseDigest,
    payloadDigest: scope.payloadDigest,
    files: Object.freeze(scope.files.map((file) => Object.freeze({
      relativePath: file.relativePath,
      mode: file.mode,
      contentDigest: file.contentDigest,
    }))),
    directories: Object.freeze(scope.directories),
  });
}

function sameScope(left: LedgerPluginScopeV1, right: LedgerPluginScopeV1): boolean {
  return left.pluginId === right.pluginId
    && left.releaseDigest === right.releaseDigest
    && left.payloadDigest === right.payloadDigest
    && left.files.length === right.files.length
    && left.files.every((file, index) => {
      const peer = right.files[index];
      return peer !== undefined
        && file.relativePath === peer.relativePath
        && file.mode === peer.mode
        && file.contentDigest === peer.contentDigest;
    })
    && left.directories.length === right.directories.length
    && left.directories.every((directory, index) => directory === right.directories[index]);
}

function sameLedgerState(
  current: ExportLedgerV1,
  scopes: readonly LedgerPluginScopeV1[],
  completeSet: ExportLedgerV1["body"]["completeSet"],
): boolean {
  return current.body.scopes.length === scopes.length
    && current.body.scopes.every((scope, index) => {
      const peer = scopes[index];
      return peer !== undefined && sameScope(scope, peer);
    })
    && sameCompleteSet(current.body.completeSet, completeSet);
}

function sameCompleteSet(
  left: ExportLedgerV1["body"]["completeSet"],
  right: ExportLedgerV1["body"]["completeSet"],
): boolean {
  if (left === null || right === null) return left === right;
  return left.releaseSetDigest === right.releaseSetDigest
    && left.members.length === right.members.length
    && left.members.every((member, index) => {
      const peer = right.members[index];
      return peer !== undefined && member.pluginId === peer.pluginId && member.releaseDigest === peer.releaseDigest;
    });
}

function ancestorDirectories(relativePath: string): readonly string[] {
  const directories: string[] = [];
  let current = posix.dirname(relativePath);
  while (current !== ".") {
    directories.push(current);
    current = posix.dirname(current);
  }
  return Object.freeze(directories.reverse());
}

function requireEntry(
  entries: ReadonlyMap<string, ExportDestinationEntryObservation>,
  path: string,
): ExportDestinationEntryObservation {
  const entry = entries.get(path);
  if (entry === undefined) throw new Error(`Destination resource omitted captured path: ${path}`);
  return entry;
}

function resourceBlocked(
  error: unknown,
  phase: string,
): Extract<DestinationPlanningResult, { ok: false }> {
  const blockedFailure = resourceFailure(error, phase);
  return Object.freeze({ ok: false, failure: blockedFailure });
}

function resourceFailure(error: unknown, phase: string): ExportFailure {
  if (isResourceFailure(error)) {
    const code = error.reason === "IdentityChanged"
      ? "PathChanged"
      : error.reason === "CleanupFailed"
        ? "TemporaryCleanupFailed"
        : "DestinationUnsafe";
    return failure(code, `${phase}:${error.operation}:${error.reason}`, error.detail, error.path);
  }
  return failure("DestinationUnsafe", phase, error instanceof Error ? error.message : String(error));
}

function isResourceFailure(error: unknown): error is ExportDestinationResourceFailure {
  return typeof error === "object" && error !== null && "_tag" in error && error._tag === "ExportDestinationFailure";
}

function blocked(
  code: ExportFailure["code"],
  phase: string,
  message: string,
  path?: string,
): Extract<DestinationPlanningResult, { ok: false }> {
  return Object.freeze({ ok: false, failure: failure(code, phase, message, path) });
}
