import type { SyncRunResult } from "#shared/entities/sync-results";
import type { SyncAssessment, WorkspaceSkip } from "../entities";
import type { SyncScope } from "#shared/entities";

const RESIDUAL_MATERIAL_KINDS = new Set(["agent", "hook", "mcp", "settings", "asset", "orchestration"]);

export function summarizeWorkspaceRun(input: {
  runs: SyncRunResult[];
  skipped: WorkspaceSkip[];
  includeMetadata: boolean;
  scope: SyncScope;
}): SyncAssessment {
  let totalTargets = 0;
  let totalConflicts = 0;
  let totalMaterialChanges = 0;
  let totalMetadataChanges = 0;
  let totalDriftItems = 0;
  let totalProjectionResiduals = 0;
  let totalMaterialProjectionResiduals = 0;
  let totalSemanticSupportResiduals = 0;

  const plugins = input.runs.map((run) => {
    let conflicts = 0;
    let materialChanges = 0;
    let metadataChanges = 0;
    const driftItems: SyncAssessment["plugins"][number]["driftItems"] = [];
    const projectionResiduals: SyncAssessment["plugins"][number]["projectionResiduals"] = [];
    const materialProjectionResiduals: SyncAssessment["plugins"][number]["materialProjectionResiduals"] = [];
    const semanticSupportResiduals: SyncAssessment["plugins"][number]["semanticSupportResiduals"] = [];

    for (const target of run.targets) {
      totalTargets += 1;
      conflicts += target.conflicts.length;
      totalConflicts += target.conflicts.length;

      const nonSkipped = target.items.filter((item) => item.action !== "skipped");
      const metadata = nonSkipped.filter((item) => item.kind === "metadata");
      const material = nonSkipped.filter((item) => item.kind !== "metadata");
      const drift = nonSkipped.filter((item) => input.includeMetadata || item.kind !== "metadata");

      metadataChanges += metadata.length;
      materialChanges += material.length;
      totalMetadataChanges += metadata.length;
      totalMaterialChanges += material.length;
      totalDriftItems += drift.length;

      driftItems.push(
        ...drift.map((item) => ({
          action: item.action,
          kind: item.kind,
          target: item.target,
          message: item.message,
        })),
      );
    }

    const materialResiduals = run.projections.filter((projection) =>
      RESIDUAL_MATERIAL_KINDS.has(projection.materialKind) &&
      projection.supportStatus !== "native" &&
      projection.supportStatus !== "legacy_or_deprecated"
    );
    totalMaterialProjectionResiduals += materialResiduals.length;
    materialProjectionResiduals.push(
      ...materialResiduals.map((projection) => ({
        provider: projection.provider,
        materialKind: projection.materialKind,
        source: projection.source,
        supportStatus: projection.supportStatus,
        message: [
          ...projection.adapterRequiredSemantics,
          ...projection.droppedSemantics.map((item) => `dropped: ${item}`),
          ...projection.validationNotes,
        ].join("; ") || `${projection.materialKind} is ${projection.supportStatus}`,
      })),
    );
    const semanticResiduals = run.projections.flatMap((projection) =>
      projection.semanticSupport
        .filter((support) => support.supportStatus !== "native")
        .map((support) => ({
          provider: support.provider,
          materialKind: projection.materialKind,
          semanticKind: support.semanticKind,
          source: support.source,
          supportStatus: support.supportStatus,
          message: support.notes.join("; ") || `${support.semanticKind} is ${support.supportStatus}`,
        }))
    );
    totalSemanticSupportResiduals += semanticResiduals.length;
    semanticSupportResiduals.push(...semanticResiduals);
    projectionResiduals.push(...materialProjectionResiduals);
    totalProjectionResiduals = totalMaterialProjectionResiduals + totalSemanticSupportResiduals;

    return {
      dirName: run.sourcePlugin.dirName,
      absPath: run.sourcePlugin.absPath,
      conflicts,
      materialChanges,
      metadataChanges,
      driftItems,
      projectionResiduals,
      materialProjectionResiduals,
      semanticSupportResiduals,
    };
  });

  const status = totalConflicts > 0
    ? "CONFLICTS"
    : totalDriftItems > 0
      ? "DRIFT_DETECTED"
      : "IN_SYNC";

  return {
    status,
    includeMetadata: input.includeMetadata,
    scope: input.scope,
    summary: {
      totalPlugins: plugins.length,
      totalTargets,
      totalConflicts,
      totalMaterialChanges,
      totalMetadataChanges,
      totalDriftItems,
      totalProjectionResiduals,
      totalMaterialProjectionResiduals,
      totalSemanticSupportResiduals,
    },
    skipped: input.skipped,
    plugins,
  };
}
