import type { AgentConfigSyncResources, AgentConfigSyncUndoCapture } from "../resources";

type DeletePathAction = "planned" | "deleted" | "skipped";
type WriteJsonAction = "planned" | "updated";
type WriteTextAction = "planned" | "updated" | "skipped";

export async function deletePathIfPresent(input: {
  dryRun: boolean;
  target: string;
  recursive?: boolean;
  undoCapture?: Pick<AgentConfigSyncUndoCapture, "captureDeleteTarget">;
  resources: AgentConfigSyncResources;
}): Promise<DeletePathAction> {
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
}): Promise<WriteJsonAction> {
  if (input.dryRun) return "planned";
  await input.undoCapture?.captureWriteTarget(input.target);
  await input.resources.files.writeJsonFile(input.target, input.data);
  return "updated";
}

export async function writeTextWithUndoCapture(input: {
  dryRun: boolean;
  target: string;
  content: string;
  undoCapture?: Pick<AgentConfigSyncUndoCapture, "captureWriteTarget">;
  resources: AgentConfigSyncResources;
}): Promise<WriteTextAction> {
  const existing = await input.resources.files.readTextFile(input.target);
  if (existing === input.content) return "skipped";
  if (input.dryRun) return "planned";
  await input.undoCapture?.captureWriteTarget(input.target);
  await input.resources.files.writeTextFile(input.target, input.content);
  return "updated";
}
