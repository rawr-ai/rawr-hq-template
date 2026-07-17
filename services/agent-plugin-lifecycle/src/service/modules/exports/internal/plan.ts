import type { PluginId } from "../../../shared/release/index";

import type { ExportFailure } from "./contract";
import type {
  CapturedDirectory,
  CapturedPath,
  DestinationIdentity,
} from "./filesystem-model";
import type { PlannedExportFile } from "./layout";
import type {
  ExportLedgerV1,
  LedgerFileClaimV1,
  LedgerPluginScopeV1,
} from "./ledger";

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
