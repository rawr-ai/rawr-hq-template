import {
  compareCanonicalText,
  type PluginId,
} from "@rawr/agent-plugin-release";

import type {
  ExportFailure,
  ExportLayoutV1,
  ExportOverwritePolicyV1,
} from "./contract";
import {
  captureDirectFile,
  captureExistingDirectory,
  capturePath,
  ExportFilesystemError,
  failure,
  listCapturedDirectoryEntries,
  revalidateCapturedPath,
  visibleFileMode,
  type CapturedPath,
  type CapturedDirectory,
  type DestinationIdentity,
} from "./filesystem";
import type { PlannedExportFile, PlannedPluginScope, RenderedExportSelection } from "./layout";
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
import { bytesEqual } from "./canonical";

export interface CapturedLedgerState {
  readonly slot: CapturedPath;
  readonly ledger: ExportLedgerV1;
  readonly persisted: boolean;
}

export interface PlannedPayloadWrite {
  readonly file: PlannedExportFile;
  readonly prior: CapturedPath;
  readonly authority: "plugin-claim" | "planned-adoption";
  readonly authorityReleaseDigest: LedgerPluginScopeV1["releaseDigest"];
  readonly createdDirectories: readonly string[];
}

export interface PlannedPayloadRetirement {
  readonly pluginId: PluginId;
  readonly releaseDigest: LedgerPluginScopeV1["releaseDigest"];
  readonly claim: LedgerFileClaimV1;
  readonly prior: Extract<CapturedPath, { kind: "Present" }>;
  readonly removableDirectories: readonly string[];
}

export interface PlannedDirectoryRetirement {
  readonly pluginId: PluginId;
  readonly releaseDigest: LedgerPluginScopeV1["releaseDigest"];
  readonly relativePath: string;
  readonly prior: CapturedDirectory;
}

export interface DestinationExportPlan {
  readonly destination: DestinationIdentity;
  readonly current: CapturedLedgerState;
  readonly nextLedger: ExportLedgerV1;
  readonly nextLedgerBytes: Uint8Array;
  readonly writes: readonly PlannedPayloadWrite[];
  readonly retirements: readonly PlannedPayloadRetirement[];
  readonly directoryRetirements: readonly PlannedDirectoryRetirement[];
  readonly verifiedPaths: readonly string[];
  readonly preservedPaths: readonly string[];
  readonly ledgerChange: boolean;
  readonly converged: boolean;
}

export type DestinationPlanningResult =
  | Readonly<{ ok: true; plan: DestinationExportPlan }>
  | Readonly<{ ok: false; failure: ExportFailure }>;

export async function buildDestinationExportPlan(
  destination: DestinationIdentity,
  layout: ExportLayoutV1,
  selection: Exclude<RenderedExportSelection, { ok: false }>,
  overwritePolicy: ExportOverwritePolicyV1,
): Promise<DestinationPlanningResult> {
  try {
    const current = await captureLedger(destination, layout);
    const liveClaims = await captureAllManagedClaims(destination, current.ledger);
    const desiredScopes = selection.scopes.map(scopeFromPlan);
    const desiredByPlugin = new Map(desiredScopes.map((scope) => [scope.pluginId, scope]));
    const currentByPlugin = new Map(current.ledger.body.scopes.map((scope) => [scope.pluginId, scope]));
    const allCurrentClaims = new Map<string, { scope: LedgerPluginScopeV1; claim: LedgerFileClaimV1 }>();
    for (const scope of current.ledger.body.scopes) {
      for (const claim of scope.files) allCurrentClaims.set(claim.relativePath, { scope, claim });
    }

    const writes: PlannedPayloadWrite[] = [];
    const verifiedPaths: string[] = [];
    const assignedDirectories = new Set<string>();
    const desiredFiles = selection.scopes
      .flatMap((scope) => scope.files)
      .sort((left, right) => compareCanonicalText(left.relativePath, right.relativePath));
    for (const file of desiredFiles) {
      const prior = await capturePath(destination, file.relativePath);
      const currentClaim = allCurrentClaims.get(file.relativePath);
      if (currentClaim !== undefined) {
        const managed = liveClaims.get(file.relativePath);
        if (managed === undefined || managed.kind !== "Present") {
          return blocked("ManagedStateMismatch", "managed-preflight", "Ledger-owned path is not one verified live file", file.relativePath);
        }
        if (
          visibleFileMode(managed.file) === file.mode
          && managed.file.contentDigest === file.contentDigest
          && bytesEqual(managed.file.bytes, file.bytes)
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
      if (prior.kind === "Present" && overwritePolicy === "managed-only") {
        return blocked("UnmanagedCollision", "collision-preflight", "Unmanaged planned path is preserved under managed-only", file.relativePath);
      }
      const createdDirectories = prior.missingDirectories.filter((directory) => {
        if (assignedDirectories.has(directory)) return false;
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
        if (prior === undefined || prior.kind !== "Present") {
          return blocked("ManagedStateMismatch", "retirement-preflight", "Retirement claim is not one verified live file", claim.relativePath);
        }
        const desiredDirectories = new Set([...desiredByPlugin.values()].flatMap((candidate) => candidate.directories));
        const removableDirectories = scope.directories.filter((directory) => !desiredDirectories.has(directory));
        retirements.push(Object.freeze({
          pluginId: scope.pluginId,
          releaseDigest: scope.releaseDigest,
          claim,
          prior,
          removableDirectories: Object.freeze(removableDirectories),
        }));
      }
    }
    retirements.sort((left, right) => compareCanonicalText(left.claim.relativePath, right.claim.relativePath));
    const directoryRetirementAuthority = new Map<string, Readonly<{
      pluginId: PluginId;
      releaseDigest: LedgerPluginScopeV1["releaseDigest"];
    }>>();
    for (const retirement of retirements) {
      for (const relativePath of retirement.removableDirectories) {
        if (!directoryRetirementAuthority.has(relativePath)) {
          directoryRetirementAuthority.set(relativePath, Object.freeze({
            pluginId: retirement.pluginId,
            releaseDigest: retirement.releaseDigest,
          }));
        }
      }
    }
    const directoryRetirements: PlannedDirectoryRetirement[] = [];
    const removableDirectoryPaths = new Set<string>();
    const retiringFilePaths = new Set<string>(retirements.map((retirement) => retirement.claim.relativePath));
    const candidates = [...directoryRetirementAuthority.entries()].sort((left, right) =>
      right[0].split("/").length - left[0].split("/").length
      || compareCanonicalText(right[0], left[0]));
    for (const [relativePath, authority] of candidates) {
      const prior = await captureExistingDirectory(destination, relativePath);
      const entries = await listCapturedDirectoryEntries(destination, prior);
      const removable = entries.every((name) => {
        const child = `${relativePath}/${name}`;
        return retiringFilePaths.has(child) || removableDirectoryPaths.has(child);
      });
      if (!removable) continue;
      removableDirectoryPaths.add(relativePath);
      directoryRetirements.push(Object.freeze({ ...authority, relativePath, prior }));
    }

    let nextScopes: readonly LedgerPluginScopeV1[];
    let completeSet: ExportLedgerV1["body"]["completeSet"];
    if (selection.mode === "complete-set") {
      nextScopes = Object.freeze(desiredScopes);
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
      nextScopes = Object.freeze([...merged.values()].sort((left, right) => compareCanonicalText(left.pluginId, right.pluginId)));
      const currentTarget = currentByPlugin.get(target.pluginId);
      completeSet = currentTarget !== undefined && sameScope(currentTarget, target) && writes.length === 0 && retirements.length === 0
        ? current.ledger.body.completeSet
        : null;
    }
    if (current.ledger.body.generation === Number.MAX_SAFE_INTEGER) {
      return blocked("LedgerGenerationChanged", "ledger-generation", "Ledger generation cannot advance beyond the safe-integer bound");
    }
    const provisional = createExportLedger({
      canonicalDestination: destination.path,
      layout,
      generation: current.ledger.body.generation + 1,
      scopes: nextScopes,
      completeSet,
    });
    const ledgerChange = !sameLedgerState(current.ledger, provisional);
    const nextLedger = ledgerChange ? provisional : current.ledger;
    const preservedPaths = current.ledger.body.scopes
      .filter((scope) => selection.mode === "targeted-release" && scope.pluginId !== selection.scopes[0].pluginId)
      .flatMap((scope) => scope.files.map((file) => file.relativePath))
      .sort(compareCanonicalText);
    const converged = writes.length === 0 && retirements.length === 0 && !ledgerChange;
    if (converged) {
      await revalidateCapturedLedger(current);
      for (const captured of liveClaims.values()) await revalidateCapturedPath(captured);
    }
    return {
      ok: true,
      plan: Object.freeze({
        destination,
        current,
        nextLedger,
        nextLedgerBytes: canonicalSerializeExportLedger(nextLedger),
        writes: Object.freeze(writes),
        retirements: Object.freeze(retirements),
        directoryRetirements: Object.freeze(directoryRetirements),
        verifiedPaths: Object.freeze(verifiedPaths.sort(compareCanonicalText)),
        preservedPaths: Object.freeze(preservedPaths),
        ledgerChange,
        converged,
      }),
    };
  } catch (error) {
    if (error instanceof ExportFilesystemError) return { ok: false, failure: error.failure };
    return blocked(
      "LedgerInvalid",
      "destination-plan",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function revalidateCapturedLedger(state: CapturedLedgerState): Promise<void> {
  await revalidateCapturedPath(state.slot);
}

async function captureLedger(
  destination: DestinationIdentity,
  layout: ExportLayoutV1,
): Promise<CapturedLedgerState> {
  const slot = await captureDirectFile(destination, EXPORT_LEDGER_FILENAME);
  if (slot.kind === "Absent") {
    return Object.freeze({ slot, ledger: initialExportLedger(destination.path, layout), persisted: false });
  }
  if (visibleFileMode(slot.file) !== 0o644) throw new Error("Ledger file mode is not canonical 0644");
  const verified = verifyExportLedgerBytes(slot.file.bytes, destination.path);
  if (!verified.ok) throw new Error(verified.message);
  if (verified.ledger.body.layout !== layout) throw new Error("Destination ledger belongs to another layout protocol");
  return Object.freeze({ slot, ledger: verified.ledger, persisted: true });
}

async function captureAllManagedClaims(
  destination: DestinationIdentity,
  ledger: ExportLedgerV1,
): Promise<ReadonlyMap<string, CapturedPath>> {
  const captures = new Map<string, CapturedPath>();
  for (const scope of ledger.body.scopes) {
    for (const claim of scope.files) {
      const captured = await capturePath(destination, claim.relativePath);
      if (
        captured.kind !== "Present"
        || visibleFileMode(captured.file) !== claim.mode
        || captured.file.contentDigest !== claim.contentDigest
      ) throw new Error(`Ledger claim does not match live state: ${claim.relativePath}`);
      captures.set(claim.relativePath, captured);
    }
  }
  return captures;
}

function scopeFromPlan(scope: PlannedPluginScope): LedgerPluginScopeV1 {
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

function sameLedgerState(left: ExportLedgerV1, right: ExportLedgerV1): boolean {
  return left.body.scopes.length === right.body.scopes.length
    && left.body.scopes.every((scope, index) => {
      const peer = right.body.scopes[index];
      return peer !== undefined && sameScope(scope, peer);
    })
    && sameCompleteSet(left.body.completeSet, right.body.completeSet);
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
      return peer !== undefined
        && member.pluginId === peer.pluginId
        && member.releaseDigest === peer.releaseDigest;
    });
}

function blocked(
  code: ExportFailure["code"],
  phase: string,
  message: string,
  path?: string,
): DestinationPlanningResult {
  return { ok: false, failure: failure(code, phase, message, path) };
}
