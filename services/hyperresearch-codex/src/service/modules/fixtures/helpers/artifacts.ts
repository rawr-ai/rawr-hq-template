import type { HyperresearchStepRecord } from "../../../common/entities";
import type { HyperresearchCodexIO } from "../../../common/resources";

export async function writeSyntheticArtifact(input: {
  step: HyperresearchStepRecord;
  artifactRoot: string;
  fileName: string;
  content: string;
  io: HyperresearchCodexIO;
}): Promise<void> {
  const artifactPath = input.io.join(input.artifactRoot, input.fileName);
  await input.io.writeTextFile(artifactPath, input.content);
  if (!input.step.artifacts.includes(input.fileName)) input.step.artifacts.push(input.fileName);
}
