import type { AgentConfigSyncResources, AgentConfigSyncUndoCapture } from "../../../shared/resources";
import type { RetireAction } from "../contract";

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
