import type { HyperresearchStepDefinition } from "../../../../model/entities";

export const syntheticHyperresearchSteps: HyperresearchStepDefinition[] = [
  {
    id: "01-canonical-query",
    title: "Canonical query and vault bootstrap",
    fileName: "01-canonical-query.md",
    requiredArtifacts: ["canonical-query.json"],
  },
  {
    id: "02-source-capture",
    title: "CLI-backed source capture",
    fileName: "02-source-capture.md",
    requiredArtifacts: ["source-note.json"],
  },
  {
    id: "03-final-artifact",
    title: "Final artifact and integrity gates",
    fileName: "03-final-artifact.md",
    requiredArtifacts: ["final-report.md"],
  },
];

export function definitionForSyntheticStep(stepId: string): HyperresearchStepDefinition {
  const definition = syntheticHyperresearchSteps.find((step) => step.id === stepId);
  if (!definition) throw new Error(`Unknown Hyperresearch Codex step: ${stepId}`);
  return definition;
}
