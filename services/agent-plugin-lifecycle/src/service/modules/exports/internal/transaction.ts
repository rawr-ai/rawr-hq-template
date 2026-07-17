import {
  contentDigest,
  parseReleaseRelativePath,
  type PluginId,
  type ReleaseDigest,
  type ReleaseRelativePath,
} from "../../../shared/release/index";

import type {
  ExportAppliedEvent,
  ExportFailpoints,
  ExportFailureSet,
  UndoApplyingSession,
  UndoReleaseResult,
} from "./contract";
import {
  createExportInverseAction,
  directoryPriorFromCaptured,
  exportInverseActionDigest,
  fileStateFromBytes,
  fileStateFromCaptured,
  type ExportActionAuthorityV1,
  type ExportInverseActionV1,
} from "./inverse-action";
import { EXPORT_LEDGER_FILENAME } from "./ledger";
import type { DestinationExportPlan } from "./plan";

export interface ExportMutationSession {
  readonly capsule: {
    generation: string;
    synchronization: UndoReleaseResult | null;
  };
  readonly undoSession: UndoApplyingSession;
  readonly admittedActionSequence: {
    readonly entries: readonly Readonly<{
      actionDigest: ReturnType<typeof exportInverseActionDigest>;
      actionHandle: string;
    }>[];
    nextIndex: number;
  };
  readonly failpoints?: ExportFailpoints;
  readonly operationId?: () => string;
}

export type DestinationTransactionResult =
  | Readonly<{
    kind: "Applied";
    applied: readonly ExportAppliedEvent[];
    verifiedPaths: readonly string[];
    retiredPaths: readonly string[];
    preservedPaths: readonly string[];
  }>
  | Readonly<{ kind: "Rejected"; failures: ExportFailureSet }>
  | Readonly<{
    kind: "Unsettled";
    applied: readonly ExportAppliedEvent[];
    failures: ExportFailureSet;
  }>;

export function planDestinationInverseActions(
  plan: DestinationExportPlan,
): readonly ExportInverseActionV1[] {
  const actions: ExportInverseActionV1[] = [];
  const createdDirectories = new Set<string>();
  for (const write of plan.writes) {
    const authority = pluginAuthority(write.authority, write.file.pluginId, write.authorityReleaseDigest);
    for (const directory of write.createdDirectories) {
      if (createdDirectories.has(directory)) continue;
      const relativePath = mustRelativePath(directory);
      actions.push(createExportInverseAction({
        ...actionBase(plan, authority, relativePath),
        mutation: "create-directory",
        prior: Object.freeze({ kind: "Absent" }),
        expectedPost: Object.freeze({ kind: "Directory", mode: 0o755 }),
      }));
      createdDirectories.add(directory);
    }
    actions.push(createExportInverseAction({
      ...actionBase(plan, authority, write.file.relativePath),
      mutation: "write-payload",
      prior: write.prior.kind === "Absent"
        ? Object.freeze({ kind: "Absent" })
        : fileStateFromCaptured(write.prior.file),
      expectedPost: fileStateFromBytes(write.file.bytes, write.file.mode, write.file.contentDigest),
    }));
  }
  for (const retirement of plan.retirements) {
    actions.push(createExportInverseAction({
      ...actionBase(
        plan,
        pluginAuthority("plugin-claim", retirement.pluginId, retirement.releaseDigest),
        retirement.claim.relativePath,
      ),
      mutation: "retire-payload",
      prior: fileStateFromCaptured(retirement.prior.file),
      expectedPost: Object.freeze({ kind: "Absent" }),
    }));
  }
  for (const retirement of plan.directoryRetirements) {
    actions.push(createExportInverseAction({
      ...actionBase(
        plan,
        pluginAuthority("plugin-claim", retirement.pluginId, retirement.releaseDigest),
        mustRelativePath(retirement.relativePath),
      ),
      mutation: "retire-directory",
      prior: directoryPriorFromCaptured(retirement.prior),
      expectedPost: Object.freeze({ kind: "Absent" }),
    }));
  }
  if (plan.ledgerChange) {
    actions.push(createExportInverseAction({
      ...actionBase(
        plan,
        Object.freeze({ kind: "destination-ledger", nextGeneration: plan.nextLedger.body.generation }),
        mustRelativePath(EXPORT_LEDGER_FILENAME),
      ),
      mutation: "write-ledger",
      prior: plan.current.slot.kind === "Absent"
        ? Object.freeze({ kind: "Absent" })
        : fileStateFromCaptured(plan.current.slot.file),
      expectedPost: fileStateFromBytes(plan.nextLedgerBytes, 0o644, contentDigest(plan.nextLedgerBytes)),
    }));
  }
  return Object.freeze(actions);
}

function actionBase(
  plan: DestinationExportPlan,
  authority: ExportActionAuthorityV1,
  relativePath: ReleaseRelativePath,
): Pick<
  ExportInverseActionV1,
  "canonicalDestination" | "layout" | "ledgerGeneration" | "ledgerDigest" | "authority" | "relativePath"
> {
  return {
    canonicalDestination: plan.destination.path,
    layout: plan.nextLedger.body.layout,
    ledgerGeneration: plan.current.ledger.body.generation,
    ledgerDigest: plan.current.ledger.ledgerDigest,
    authority,
    relativePath,
  };
}

function pluginAuthority(
  kind: "plugin-claim" | "planned-adoption",
  pluginId: PluginId,
  releaseDigest: ReleaseDigest,
): ExportActionAuthorityV1 {
  return Object.freeze({ kind, pluginId, releaseDigest });
}

function mustRelativePath(input: string): ReleaseRelativePath {
  const parsed = parseReleaseRelativePath(input);
  if (!parsed.ok) throw new TypeError(`Derived export path is unsafe: ${input}`);
  return parsed.value;
}
