import type { AgentConfigSyncResources, AgentConfigSyncUndoCapture } from "../../../shared/resources";
import type { RetireAction } from "../entities";

export async function deletePathIfPresent(input: {
  dryRun: boolean;
  target: string;
  recursive?: boolean;
  undoCapture?: Pick<AgentConfigSyncUndoCapture, "captureDeleteTarget">;
  resources: AgentConfigSyncResources;
}): Promise<Extract<RetireAction["action"], "planned" | "deleted" | "skipped">> {
  const kind = await input.resources.files.statPathKind(input.target);
  if (!kind) return "skipped";
  if (input.dryRun) return "planned";

  await input.undoCapture?.captureDeleteTarget(input.target);
  await input.resources.files.removePath(input.target, { recursive: input.recursive ?? kind === "dir" });
  return "deleted";
}

export async function writeJsonWithUndoCapture(input: {
  dryRun: boolean;
  target: string;
  data: unknown;
  undoCapture?: Pick<AgentConfigSyncUndoCapture, "captureWriteTarget">;
  resources: AgentConfigSyncResources;
}): Promise<Extract<RetireAction["action"], "planned" | "updated">> {
  if (input.dryRun) return "planned";
  await input.undoCapture?.captureWriteTarget(input.target);
  await input.resources.files.writeJsonFile(input.target, input.data);
  return "updated";
}
