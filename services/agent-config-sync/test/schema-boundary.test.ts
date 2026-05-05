import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

type SchemaClassification = {
  path: string;
  symbol: string;
  owner:
    | "shared-entity"
    | "source-content-entity"
    | "planning-entity"
    | "execution-contract"
    | "planning-contract"
    | "retirement-entity"
    | "retirement-contract"
    | "undo-entity"
    | "undo-contract";
  form: "typebox";
};

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "../../..");

const scopeRoots = [
  path.join(repoRoot, "services/agent-config-sync/src"),
  path.join(repoRoot, "packages/agent-config-sync-node/src"),
];

const schemaLedger: SchemaClassification[] = [
  { path: "services/agent-config-sync/src/service/modules/execution/contract.ts", symbol: "RunSyncInputSchema", owner: "execution-contract", form: "typebox" },
  { path: "services/agent-config-sync/src/service/modules/execution/contract.ts", symbol: "ResolveProviderContentInputSchema", owner: "execution-contract", form: "typebox" },
  { path: "services/agent-config-sync/src/service/modules/planning/contract.ts", symbol: "WorkspaceRootErrorDataSchema", owner: "planning-contract", form: "typebox" },
  { path: "services/agent-config-sync/src/service/modules/planning/contract.ts", symbol: "WorkspacePlanningBaseInputSchema", owner: "planning-contract", form: "typebox" },
  { path: "services/agent-config-sync/src/service/modules/planning/contract.ts", symbol: "PlanWorkspaceSyncInputSchema", owner: "planning-contract", form: "typebox" },
  { path: "services/agent-config-sync/src/service/modules/planning/contract.ts", symbol: "AssessWorkspaceSyncInputSchema", owner: "planning-contract", form: "typebox" },
  { path: "services/agent-config-sync/src/service/modules/planning/entities.ts", symbol: "SyncAgentSelectionSchema", owner: "planning-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/modules/planning/entities.ts", symbol: "DestinationConfigSchema", owner: "planning-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/modules/planning/entities.ts", symbol: "TargetHomeCandidatesSchema", owner: "planning-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/modules/planning/entities.ts", symbol: "TargetHomesSchema", owner: "planning-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/modules/planning/entities.ts", symbol: "WorkspaceSkipSchema", owner: "planning-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/modules/planning/entities.ts", symbol: "WorkspaceSyncableSchema", owner: "planning-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/modules/planning/entities.ts", symbol: "FullSyncPolicyInputSchema", owner: "planning-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/modules/planning/entities.ts", symbol: "FullSyncPolicyResultSchema", owner: "planning-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/modules/planning/entities.ts", symbol: "DriftItemSchema", owner: "planning-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/modules/planning/entities.ts", symbol: "ProjectionResidualSchema", owner: "planning-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/modules/planning/entities.ts", symbol: "SemanticSupportResidualSchema", owner: "planning-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/modules/planning/entities.ts", symbol: "SyncAssessmentSchema", owner: "planning-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/modules/planning/entities.ts", symbol: "WorkspaceSyncPlanSchema", owner: "planning-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/modules/retirement/contract.ts", symbol: "RetireStaleManagedInputSchema", owner: "retirement-contract", form: "typebox" },
  { path: "services/agent-config-sync/src/service/modules/retirement/contract.ts", symbol: "RetireStaleManagedResultSchema", owner: "retirement-contract", form: "typebox" },
  { path: "services/agent-config-sync/src/service/modules/retirement/entities.ts", symbol: "RetireActionSchema", owner: "retirement-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/modules/retirement/entities.ts", symbol: "RetiredPluginRefSchema", owner: "retirement-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/modules/undo/contract.ts", symbol: "RunUndoInputSchema", owner: "undo-contract", form: "typebox" },
  { path: "services/agent-config-sync/src/service/modules/undo/contract.ts", symbol: "UndoRunResultSchema", owner: "undo-contract", form: "typebox" },
  { path: "services/agent-config-sync/src/service/modules/undo/entities.ts", symbol: "UndoApplyItemSchema", owner: "undo-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/shared/entities.ts", symbol: "RawrPluginKindSchema", owner: "shared-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/shared/entities.ts", symbol: "SyncAgentSchema", owner: "shared-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/shared/entities.ts", symbol: "ProviderKeySchema", owner: "shared-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/shared/entities.ts", symbol: "MaterialKindSchema", owner: "shared-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/shared/entities.ts", symbol: "SemanticCapabilityKindSchema", owner: "shared-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/shared/entities.ts", symbol: "DistributionModeSchema", owner: "shared-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/shared/entities.ts", symbol: "SupportStatusSchema", owner: "shared-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/shared/entities.ts", symbol: "ProjectionSupportStatusSchema", owner: "shared-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/shared/entities.ts", symbol: "EvidenceLevelSchema", owner: "shared-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/shared/entities.ts", symbol: "SyncScopeSchema", owner: "shared-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/shared/entities.ts", symbol: "SyncActionSchema", owner: "shared-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/shared/entities.ts", symbol: "SyncItemKindSchema", owner: "shared-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/shared/entities.ts", symbol: "ContentFileSchema", owner: "shared-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/shared/entities.ts", symbol: "OrchestrationSpecSchema", owner: "shared-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/shared/entities.ts", symbol: "SourcePluginSchema", owner: "shared-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/shared/entities.ts", symbol: "SourceContentSchema", owner: "shared-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/shared/entities/sync-results.ts", symbol: "SyncScannedSummarySchema", owner: "shared-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/shared/entities/sync-results.ts", symbol: "SyncItemResultSchema", owner: "shared-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/shared/entities/sync-results.ts", symbol: "SyncTargetResultSchema", owner: "shared-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/shared/entities/sync-results.ts", symbol: "ProjectionSupportSchema", owner: "shared-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/shared/entities/sync-results.ts", symbol: "ProviderProjectionSchema", owner: "shared-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/shared/entities/sync-results.ts", symbol: "SyncRunResultSchema", owner: "shared-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/shared/source-content/entities.ts", symbol: "PluginContentIncludeSchema", owner: "source-content-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/shared/source-content/entities.ts", symbol: "PluginContentProviderSchema", owner: "source-content-entity", form: "typebox" },
  { path: "services/agent-config-sync/src/service/shared/source-content/entities.ts", symbol: "PluginContentManifestV1Schema", owner: "source-content-entity", form: "typebox" },
];

function collectFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(root, entry.name);
      if (entry.isDirectory()) return collectFiles(entryPath);
      return entry.isFile() && entry.name.endsWith(".ts") ? [entryPath] : [];
    });
}

function relativePath(filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}

function collectSchemaDeclarations() {
  const declarationPattern = /\b(?:export\s+)?const\s+([A-Za-z0-9_]*Schema)\s*=/g;
  return scopeRoots
    .flatMap(collectFiles)
    .flatMap((filePath) => {
      const source = fs.readFileSync(filePath, "utf8");
      return [...source.matchAll(declarationPattern)].map((match) => ({
        path: relativePath(filePath),
        symbol: match[1],
      }));
    })
    .sort((a, b) => `${a.path}:${a.symbol}`.localeCompare(`${b.path}:${b.symbol}`));
}

describe("agent-config-sync schema boundary", () => {
  it("keeps scoped schema declarations classified in the schema ledger", () => {
    const discovered = collectSchemaDeclarations();
    const expected = schemaLedger
      .map(({ path, symbol }) => ({ path, symbol }))
      .sort((a, b) => `${a.path}:${a.symbol}`.localeCompare(`${b.path}:${b.symbol}`));

    expect(discovered).toEqual(expected);
  });

  it("keeps service and package schemas on TypeBox unless a runtime lane is added", () => {
    const runtimeSchemas = schemaLedger.filter((entry) => entry.form !== "typebox");

    expect(runtimeSchemas).toEqual([]);
  });

  it("keeps oRPC wrappers pointed at named TypeBox schemas", () => {
    const inlineWrappedTypeBox = scopeRoots
      .flatMap(collectFiles)
      .flatMap((filePath) => {
        const source = fs.readFileSync(filePath, "utf8");
        return /schema\s*\(\s*Type\./.test(source) ? [relativePath(filePath)] : [];
      });

    expect(inlineWrappedTypeBox).toEqual([]);
  });

  it("does not import RuntimeSchema without an explicitly classified runtime lane", () => {
    const runtimeImports = scopeRoots
      .flatMap(collectFiles)
      .flatMap((filePath) => {
        const source = fs.readFileSync(filePath, "utf8");
        return /\bRuntimeSchema\b|defineRuntimeSchema|@rawr\/sdk\/runtime\/schema/.test(source)
          ? [relativePath(filePath)]
          : [];
      });

    expect(runtimeImports).toEqual([]);
  });
});
