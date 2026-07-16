import { posix } from "node:path";

import { compareCanonicalText } from "@rawr/agent-plugin-release";

import {
  EXPORT_LEDGER_FILENAME,
  initialExportLedger,
  verifyExportLedgerBytes,
  type ExportLedgerV1,
} from "./ledger";
import {
  exportInverseActionDigest,
  fileStateBytes,
  verifyExportInverseAction,
  type ExportActionAuthorityV1,
  type ExportInverseActionV1,
} from "./inverse-action";

export type ExportOwnerActionSequenceModeV1 = "complete" | "applied-prefix";

type ExportLedgerActionV1 = ExportInverseActionV1 & Readonly<{
  mutation: "write-ledger";
  authority: Extract<ExportActionAuthorityV1, { kind: "destination-ledger" }>;
}>;

export function validateExportOwnerActionSequence(input: Readonly<{
  actions: readonly ExportInverseActionV1[];
  mode: ExportOwnerActionSequenceModeV1;
}>): void {
  if (input.mode !== "complete" && input.mode !== "applied-prefix") {
    throw new Error("export action sequence mode is unsupported");
  }
  if (input.actions.length === 0) throw new Error("export action sequence must not be empty");

  const actions = input.actions.map(requireAction);
  const digests = new Set<string>();
  const groups: ExportInverseActionV1[][] = [];
  let current: ExportInverseActionV1[] | undefined;
  let previousDestination: string | undefined;
  for (const action of actions) {
    const digest = exportInverseActionDigest(action);
    if (digests.has(digest)) throw new Error(`export inverse action is duplicated: ${digest}`);
    digests.add(digest);

    if (action.canonicalDestination !== previousDestination) {
      if (
        previousDestination !== undefined
        && compareCanonicalText(previousDestination, action.canonicalDestination) >= 0
      ) {
        throw new Error("export action destination groups are interleaved or not canonical");
      }
      current = [];
      groups.push(current);
      previousDestination = action.canonicalDestination;
    }
    current!.push(action);
  }

  for (let index = 0; index < groups.length; index += 1) {
    validateDestinationGroup(
      groups[index]!,
      input.mode === "applied-prefix" && index === groups.length - 1
        ? "applied-prefix"
        : "complete",
    );
  }
}

function validateDestinationGroup(
  actions: readonly ExportInverseActionV1[],
  mode: ExportOwnerActionSequenceModeV1,
): void {
  const first = actions[0]!;
  const paths = new Set<string>();
  const pendingDirectories: ExportInverseActionV1[] = [];
  const retiredPayloadPaths: string[] = [];
  const retiredDirectoryPaths: string[] = [];
  let phase = 0;
  let previousWritePath: string | undefined;
  let previousRetirementPath: string | undefined;
  let previousDirectoryRetirement: string | undefined;
  let ledgerAction: ExportLedgerActionV1 | undefined;

  for (let index = 0; index < actions.length; index += 1) {
    const action = actions[index]!;
    if (
      action.layout !== first.layout
      || action.ledgerGeneration !== first.ledgerGeneration
      || action.ledgerDigest !== first.ledgerDigest
    ) {
      throw new Error("export destination action group does not share one prior ledger authority");
    }
    if (paths.has(action.relativePath)) {
      throw new Error(`export destination action path is duplicated: ${action.relativePath}`);
    }
    paths.add(action.relativePath);

    const nextPhase = actionPhase(action);
    if (nextPhase < phase) throw new Error("export action sequence regresses to an earlier phase");
    phase = nextPhase;

    if (isLedgerAction(action)) {
      if (action.relativePath !== EXPORT_LEDGER_FILENAME) {
        throw new Error("export ledger action does not target the canonical ledger path");
      }
      if (index !== actions.length - 1) {
        throw new Error("export ledger action is first or in the middle instead of final");
      }
      if (pendingDirectories.length > 0) {
        throw new Error("export write phase omits the payload following its directory prefix");
      }
      if (action.expectedPost.kind !== "Present") {
        throw new Error("export ledger action does not bind its next ledger bytes");
      }
      ledgerAction = action;
      continue;
    }
    if (action.relativePath === EXPORT_LEDGER_FILENAME) {
      throw new Error("export non-ledger action targets the reserved ledger path");
    }

    if (action.mutation === "create-directory") {
      if (pendingDirectories.length === 0) {
        if (
          previousWritePath !== undefined
          && compareCanonicalText(previousWritePath, action.relativePath) >= 0
        ) {
          throw new Error("export write phase is not in deterministic path order");
        }
      } else {
        const parent = pendingDirectories[pendingDirectories.length - 1]!;
        if (posix.dirname(action.relativePath) !== parent.relativePath) {
          throw new Error("export directory-creation prefix contains an omitted or out-of-order directory");
        }
        if (!sameAuthority(parent.authority, action.authority)) {
          throw new Error("export directory-creation prefix changes action authority");
        }
      }
      pendingDirectories.push(action);
      continue;
    }

    if (action.mutation === "write-payload") {
      if (
        previousWritePath !== undefined
        && compareCanonicalText(previousWritePath, action.relativePath) >= 0
      ) {
        throw new Error("export payload writes are not in deterministic path order");
      }
      if (pendingDirectories.length > 0) {
        const deepest = pendingDirectories[pendingDirectories.length - 1]!;
        if (posix.dirname(action.relativePath) !== deepest.relativePath) {
          throw new Error("export directory-creation prefix does not close at its payload parent");
        }
        if (pendingDirectories.some((directory) => !sameAuthority(directory.authority, action.authority))) {
          throw new Error("export directory-creation prefix does not share its payload authority");
        }
        pendingDirectories.length = 0;
      }
      previousWritePath = action.relativePath;
      continue;
    }

    if (pendingDirectories.length > 0) {
      throw new Error("export write phase omits the payload following its directory prefix");
    }
    if (action.authority.kind !== "plugin-claim") {
      throw new Error("export retirement action lacks prior plugin-claim authority");
    }

    if (action.mutation === "retire-payload") {
      if (action.expectedPost.kind !== "Absent") {
        throw new Error("export payload retirement does not bind an absent post-state");
      }
      if (
        previousRetirementPath !== undefined
        && compareCanonicalText(previousRetirementPath, action.relativePath) >= 0
      ) {
        throw new Error("export payload retirements are not in deterministic path order");
      }
      previousRetirementPath = action.relativePath;
      retiredPayloadPaths.push(action.relativePath);
      continue;
    }

    if (
      previousDirectoryRetirement !== undefined
      && compareDirectoryRetirements(previousDirectoryRetirement, action.relativePath) >= 0
    ) {
      throw new Error("export directory retirements are not in deterministic bottom-up order");
    }
    previousDirectoryRetirement = action.relativePath;
    retiredDirectoryPaths.push(action.relativePath);
  }

  if (pendingDirectories.length > 0 && mode === "complete") {
    throw new Error("complete export action sequence ends inside a directory-creation prefix");
  }
  validateDirectoryRetirementClosure(retiredPayloadPaths, retiredDirectoryPaths);
  if (ledgerAction !== undefined) validateLedgerBackedPayloadPlan(actions, ledgerAction);
}

function validateLedgerBackedPayloadPlan(
  actions: readonly ExportInverseActionV1[],
  ledgerAction: ExportLedgerActionV1,
): void {
  const priorLedger = ledgerFromPrior(ledgerAction);
  const nextLedger = ledgerFromExpectedPost(ledgerAction);
  if (
    priorLedger.body.generation !== ledgerAction.ledgerGeneration
    || priorLedger.ledgerDigest !== ledgerAction.ledgerDigest
    || ledgerAction.authority.nextGeneration !== ledgerAction.ledgerGeneration + 1
    || nextLedger.body.generation !== ledgerAction.authority.nextGeneration
  ) {
    throw new Error("export ledger action bytes do not close its bound generation transition");
  }

  const priorClaims = ledgerClaims(priorLedger);
  const nextClaims = ledgerClaims(nextLedger);
  const requiredWrites = [...nextClaims.entries()]
    .filter(([path, claim]) => {
      const prior = priorClaims.get(path);
      return prior === undefined
        || prior.mode !== claim.mode
        || prior.contentDigest !== claim.contentDigest;
    })
    .map(([path]) => path)
    .sort(compareCanonicalText);
  const requiredRetirements = [...priorClaims.keys()]
    .filter((path) => !nextClaims.has(path))
    .sort(compareCanonicalText);
  const writes = actions.filter((action) => action.mutation === "write-payload");
  const retirements = actions.filter((action) => action.mutation === "retire-payload");
  requireExactPaths(writes.map((action) => action.relativePath), requiredWrites, "payload-write");
  requireExactPaths(retirements.map((action) => action.relativePath), requiredRetirements, "payload-retirement");

  for (const action of writes) {
    const next = nextClaims.get(action.relativePath)!;
    if (
      action.expectedPost.kind !== "Present"
      || action.expectedPost.mode !== next.mode
      || action.expectedPost.contentDigest !== next.contentDigest
    ) {
      throw new Error(`export payload write does not bind its next ledger claim: ${action.relativePath}`);
    }
    const prior = priorClaims.get(action.relativePath);
    if (prior === undefined) {
      if (
        action.authority.kind !== "planned-adoption"
        || action.authority.pluginId !== next.pluginId
        || action.authority.releaseDigest !== next.releaseDigest
      ) {
        throw new Error(`export payload adoption does not bind its next ledger owner: ${action.relativePath}`);
      }
    } else if (
      action.prior.kind !== "Present"
      || action.prior.mode !== prior.mode
      || action.prior.contentDigest !== prior.contentDigest
      || action.authority.kind !== "plugin-claim"
      || action.authority.pluginId !== prior.pluginId
      || action.authority.releaseDigest !== prior.releaseDigest
    ) {
      throw new Error(`export payload replacement does not bind its prior ledger claim: ${action.relativePath}`);
    }
  }

  for (const action of retirements) {
    const prior = priorClaims.get(action.relativePath)!;
    if (
      action.prior.kind !== "Present"
      || action.prior.mode !== prior.mode
      || action.prior.contentDigest !== prior.contentDigest
      || action.authority.kind !== "plugin-claim"
      || action.authority.pluginId !== prior.pluginId
      || action.authority.releaseDigest !== prior.releaseDigest
    ) {
      throw new Error(`export payload retirement does not bind its prior ledger claim: ${action.relativePath}`);
    }
  }
}

function ledgerFromPrior(
  action: ExportLedgerActionV1,
): ExportLedgerV1 {
  if (action.prior.kind === "Absent") {
    return initialExportLedger(action.canonicalDestination, action.layout);
  }
  if (action.prior.mode !== 0o644) throw new Error("export prior ledger mode is not canonical");
  return requireLedger(action, fileStateBytes(action.prior));
}

function ledgerFromExpectedPost(
  action: ExportLedgerActionV1,
): ExportLedgerV1 {
  if (action.expectedPost.kind !== "Present" || action.expectedPost.mode !== 0o644) {
    throw new Error("export next ledger state is absent or has a noncanonical mode");
  }
  return requireLedger(action, fileStateBytes(action.expectedPost));
}

function requireLedger(
  action: ExportLedgerActionV1,
  bytes: Uint8Array,
): ExportLedgerV1 {
  const verification = verifyExportLedgerBytes(bytes, action.canonicalDestination);
  if (!verification.ok) throw new Error(`export ledger action contains invalid ledger bytes: ${verification.message}`);
  if (verification.ledger.body.layout !== action.layout) {
    throw new Error("export ledger action changes destination layout");
  }
  return verification.ledger;
}

interface SequenceLedgerClaim {
  readonly pluginId: string;
  readonly releaseDigest: string;
  readonly mode: number;
  readonly contentDigest: string;
}

function ledgerClaims(ledger: ExportLedgerV1): ReadonlyMap<string, SequenceLedgerClaim> {
  const claims = new Map<string, SequenceLedgerClaim>();
  for (const scope of ledger.body.scopes) {
    for (const file of scope.files) {
      claims.set(file.relativePath, Object.freeze({
        pluginId: scope.pluginId,
        releaseDigest: scope.releaseDigest,
        mode: file.mode,
        contentDigest: file.contentDigest,
      }));
    }
  }
  return claims;
}

function requireExactPaths(
  actual: readonly string[],
  expected: readonly string[],
  label: string,
): void {
  if (
    actual.length !== expected.length
    || actual.some((path, index) => path !== expected[index])
  ) {
    throw new Error(`export ${label} actions omit or add a ledger-declared transition`);
  }
}

function validateDirectoryRetirementClosure(
  payloadPaths: readonly string[],
  directoryPaths: readonly string[],
): void {
  const payloadParents = new Set(payloadPaths.map((path) => posix.dirname(path)));
  const groundedDirectories = new Set<string>();
  for (const directory of directoryPaths) {
    const grounded = payloadParents.has(directory)
      || [...groundedDirectories].some((child) => posix.dirname(child) === directory);
    if (!grounded) {
      throw new Error(`export directory retirement has an omitted payload or child-directory action: ${directory}`);
    }
    groundedDirectories.add(directory);
  }
}

function actionPhase(action: ExportInverseActionV1): number {
  switch (action.mutation) {
    case "create-directory":
    case "write-payload":
      return 0;
    case "retire-payload":
      return 1;
    case "retire-directory":
      return 2;
    case "write-ledger":
      return 3;
  }
}

function isLedgerAction(action: ExportInverseActionV1): action is ExportLedgerActionV1 {
  return action.mutation === "write-ledger" && action.authority.kind === "destination-ledger";
}

function compareDirectoryRetirements(left: string, right: string): number {
  return pathDepth(right) - pathDepth(left) || compareCanonicalText(right, left);
}

function pathDepth(path: string): number {
  return path.split("/").length;
}

function sameAuthority(left: ExportActionAuthorityV1, right: ExportActionAuthorityV1): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === "destination-ledger" || right.kind === "destination-ledger") {
    return left.kind === "destination-ledger"
      && right.kind === "destination-ledger"
      && left.nextGeneration === right.nextGeneration;
  }
  return left.pluginId === right.pluginId && left.releaseDigest === right.releaseDigest;
}

function requireAction(input: ExportInverseActionV1): ExportInverseActionV1 {
  const verification = verifyExportInverseAction(input);
  if (!verification.ok) throw new Error(verification.message);
  return verification.action;
}
