import type { FilesystemResource } from "@habitat-ai/resource-filesystem";
import { Effect } from "effect";
import type { Issue, ScratchInput, ScratchReport } from "../dto";
import { failureMessage } from "./command-execution";
import { issue } from "./repository-observation";

/** Observes only selected files and never turns an I/O failure into missing evidence. */
export function observeScratch(
  filesystem: FilesystemResource,
  repositoryRoot: string,
  input: ScratchInput | undefined
): Effect.Effect<{ report: ScratchReport; issues: Issue[]; failed: boolean }> {
  return Effect.gen(function* () {
    if (input === undefined) return { report: null, issues: [], failed: false };
    const report: NonNullable<ScratchReport> = { mode: input.mode ?? "warn", files: [] };
    const issues: Issue[] = [];
    let failed = false;
    for (const requested of input.files) {
      const path = filesystem.path.resolve(repositoryRoot, requested);
      const observed = yield* Effect.result(filesystem.fileSystem.stat(path));
      if (observed._tag === "Failure") {
        if (observed.failure.reason._tag !== "NotFound") {
          failed = true;
          issues.push(
            issue("ScratchObservationFailed", `${path}: ${failureMessage(observed.failure)}`)
          );
          continue;
        }
        report.files.push({ path, status: "missing" });
      } else {
        report.files.push({
          path,
          status: observed.success.type === "File" ? "present" : "not-file",
        });
      }
      if (report.files.at(-1)?.status !== "present") {
        issues.push(
          issue(
            "ScratchFileMissing",
            `Required scratch file is absent or not a regular file: ${path}`,
            report.mode === "block" ? "error" : "warning"
          )
        );
      }
    }
    return { report, issues, failed };
  });
}
