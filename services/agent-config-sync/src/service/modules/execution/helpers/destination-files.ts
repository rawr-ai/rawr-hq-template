import path from "node:path";

import type {
  AgentConfigSyncResources,
  AgentConfigSyncUndoCapture,
} from "../../../shared/resources";
import type { SyncItemResult, SyncTargetResult } from "../contract";
import { pushItem } from "./sync-results";

export type SyncFileOptions = {
  dryRun: boolean;
  force: boolean;
  undoCapture?: AgentConfigSyncUndoCapture;
  resources: AgentConfigSyncResources;
};

export async function syncFileWithConflictPolicy(input: {
  src: string;
  dest: string;
  kind: SyncItemResult["kind"];
  options: SyncFileOptions;
  result: SyncTargetResult;
  claimedByOtherPlugin?: boolean;
}): Promise<boolean> {
  const { src, dest, kind, options, result, claimedByOtherPlugin } = input;
  const exists = await options.resources.files.pathExists(dest);

  if (exists) {
    const same = await options.resources.files.filesIdentical(src, dest);
    if (same) {
      pushItem(result, { action: "skipped", kind, source: src, target: dest, message: "identical" });
      return true;
    }

    if (!options.force) {
      pushItem(result, {
        action: "conflict",
        kind,
        source: src,
        target: dest,
        message: claimedByOtherPlugin ? "owned by another plugin" : "destination differs; use --force",
      });
      return false;
    }

    if (!options.dryRun) {
      await options.undoCapture?.captureWriteTarget(dest);
      await options.resources.files.ensureDir(path.dirname(dest));
      await options.resources.files.copyFile(src, dest);
    }
    pushItem(result, { action: options.dryRun ? "planned" : "updated", kind, source: src, target: dest, message: "overwrote" });
    return true;
  }

  if (claimedByOtherPlugin && !options.force) {
    pushItem(result, {
      action: "conflict",
      kind,
      source: src,
      target: dest,
      message: "name claimed by another plugin",
    });
    return false;
  }

  if (!options.dryRun) {
    await options.undoCapture?.captureWriteTarget(dest);
    await options.resources.files.ensureDir(path.dirname(dest));
    await options.resources.files.copyFile(src, dest);
  }
  pushItem(result, { action: options.dryRun ? "planned" : "copied", kind, source: src, target: dest });
  return true;
}

export async function syncSkillDirWithConflictPolicy(input: {
  srcDir: string;
  destDir: string;
  skillName: string;
  options: SyncFileOptions;
  result: SyncTargetResult;
  claimedByOtherPlugin?: boolean;
}): Promise<boolean> {
  const { srcDir, destDir, skillName, options, result, claimedByOtherPlugin } = input;
  const exists = await options.resources.files.pathExists(destDir);

  if (exists) {
    const same = await options.resources.files.dirsIdentical(srcDir, destDir);
    if (same) {
      pushItem(result, { action: "skipped", kind: "skill", source: srcDir, target: destDir, message: "identical" });
      return true;
    }

    if (!options.force) {
      pushItem(result, {
        action: "conflict",
        kind: "skill",
        source: srcDir,
        target: destDir,
        message: claimedByOtherPlugin
          ? `skill '${skillName}' is owned by another plugin`
          : "skill directory differs; use --force",
      });
      return false;
    }

    if (!options.dryRun) {
      await options.undoCapture?.captureWriteTarget(destDir);
      await options.resources.files.ensureDir(destDir);
      await options.resources.files.copyDirTree(srcDir, destDir);
    }
    pushItem(result, {
      action: options.dryRun ? "planned" : "updated",
      kind: "skill",
      source: srcDir,
      target: destDir,
      message: "copied with force",
    });
    return true;
  }

  if (claimedByOtherPlugin && !options.force) {
    pushItem(result, {
      action: "conflict",
      kind: "skill",
      source: srcDir,
      target: destDir,
      message: `skill '${skillName}' is claimed by another plugin`,
    });
    return false;
  }

  if (!options.dryRun) {
    await options.undoCapture?.captureWriteTarget(destDir);
    await options.resources.files.ensureDir(destDir);
    await options.resources.files.copyDirTree(srcDir, destDir);
  }
  pushItem(result, { action: options.dryRun ? "planned" : "copied", kind: "skill", source: srcDir, target: destDir });
  return true;
}

export async function deleteIfExists(input: {
  target: string;
  kind: SyncItemResult["kind"];
  options: Pick<SyncFileOptions, "dryRun" | "undoCapture" | "resources">;
  result: SyncTargetResult;
}): Promise<void> {
  const { target, kind, options, result } = input;
  if (!(await options.resources.files.pathExists(target))) return;

  if (!options.dryRun) {
    await options.undoCapture?.captureDeleteTarget(target);
    await options.resources.files.removePath(target, { recursive: true });
  }

  pushItem(result, { action: options.dryRun ? "planned" : "deleted", kind, target, message: "gc orphan" });
}
