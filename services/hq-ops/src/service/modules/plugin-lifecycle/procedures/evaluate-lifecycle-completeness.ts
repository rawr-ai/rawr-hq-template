import type { LifecycleCheckData } from "../entities";
import { module } from "../module";
import {
  isCodeFile,
  isDocFile,
  isTestFile,
  relativePath,
  toPosix,
  uniqSorted,
} from "../helpers/path-utils";

/**
 * Evaluates lifecycle completeness from projection-collected git/sync evidence.
 */
export const evaluateLifecycleCompleteness = module.evaluateLifecycleCompleteness.handler(async ({ context, input }) => {
  const workspaceRoot = context.deps.resources.path.resolve(input.workspaceRoot ?? context.scope.repoRoot);
  const targetAbs = context.deps.resources.path.resolve(input.targetAbs);
  const targetRel = relativePath(workspaceRoot, targetAbs);
  const changed = uniqSorted(input.changedFiles.map(toPosix));

  const relevantChanged =
    input.type === "composed"
      ? changed
      : changed.filter((file) => file === targetRel || file.startsWith(`${targetRel}/`));

  const codeChanged = relevantChanged.filter(isCodeFile);
  const testChanged = changed.filter(
    (file) => isTestFile(file) && (input.type === "composed" || file === targetRel || file.startsWith(`${targetRel}/`)),
  );
  const docsChanged = changed.filter(
    (file) =>
      isDocFile(file) &&
      (input.type === "composed" || file === targetRel || file.startsWith(`${targetRel}/`) || file.startsWith("docs/")),
  );

  const testsRequired = ["cli", "web", "agent", "composed"].includes(input.type) && codeChanged.length > 0;
  const docsRequired = codeChanged.length > 0 || ["skill", "workflow", "composed"].includes(input.type);
  const missingTests = testsRequired && testChanged.length === 0 ? ["no test updates detected for code changes"] : [];
  const missingDocs = docsRequired && docsChanged.length === 0 ? ["no documentation updates detected for changed unit"] : [];
  const dependentFiles = uniqSorted((input.dependentFiles ?? []).map(toPosix)).filter((file) => input.repoFiles.includes(file));
  const dependentTouched = dependentFiles.length === 0 || dependentFiles.some((file) => changed.includes(file));
  const missingDependents = dependentTouched ? [] : dependentFiles.slice(0, 20);
  const status: LifecycleCheckData["status"] =
    missingTests.length === 0 &&
    missingDocs.length === 0 &&
    missingDependents.length === 0 &&
    input.syncVerified &&
    input.driftVerified
      ? "pass"
      : "fail";

  return {
    status,
    target: {
      input: input.targetInput,
      absPath: targetAbs,
      relPath: targetRel,
      type: input.type,
    },
    missingTests,
    missingDocs,
    missingDependents,
    syncVerified: input.syncVerified,
    driftVerified: input.driftVerified,
    driftDetected: input.driftDetected,
    details: {
      changedFilesConsidered: changed,
      relevantChangedFiles: relevantChanged,
      dependentFiles,
      codeChanged,
      testChanged,
      docsChanged,
    },
  };
});

