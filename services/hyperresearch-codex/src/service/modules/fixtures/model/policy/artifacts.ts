import type { HyperresearchStepRecord } from "../../../../model/entities";

export function recordSyntheticArtifact(input: {
  step: HyperresearchStepRecord;
  fileName: string;
}): void {
  if (!input.step.artifacts.includes(input.fileName)) input.step.artifacts.push(input.fileName);
}
