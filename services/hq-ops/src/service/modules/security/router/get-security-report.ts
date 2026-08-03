import { parseSecurityReport } from "../model/policy/report-format";
import { module } from "../module";

/** Returns the latest persisted security report for the selected repository. */
export const getSecurityReport = module.getSecurityReport.handler(async ({ context }) => {
  const repoRootRun = await context.process.exec("git", ["rev-parse", "--show-toplevel"], {
    cwd: context.repoRoot,
    timeoutMs: 5_000,
  });
  const repoRoot =
    repoRootRun.exitCode === 0
      ? new TextDecoder().decode(repoRootRun.stdout).trim()
      : context.repoRoot;
  const latestPath = context.path.join(repoRoot, ".rawr", "security", "latest.json");
  const raw = await context.fs.readText(latestPath);
  return raw === null ? null : parseSecurityReport(raw);
});
