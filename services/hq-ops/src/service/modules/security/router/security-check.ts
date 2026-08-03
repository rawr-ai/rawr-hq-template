import { bunAuditFindings, untrustedDependencyFinding } from "../model/policy/audit";
import {
  securityReport,
  securityReportDocument,
  sortFindings,
} from "../model/policy/report-format";
import { secretFindings } from "../model/policy/secrets";
import { module } from "../module";

const decoder = new TextDecoder();
const encoder = new TextEncoder();

function decode(bytes: Uint8Array): string {
  return decoder.decode(bytes);
}

function listedPaths(bytes: Uint8Array): string[] {
  return decode(bytes)
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);
}

/** Checks repository security and publishes the resulting report. */
export const securityCheck = module.securityCheck.handler(async ({ context, input }) => {
  const repoRootRun = await context.process.exec("git", ["rev-parse", "--show-toplevel"], {
    cwd: context.repoRoot,
    timeoutMs: 5_000,
  });
  const repoRoot =
    repoRootRun.exitCode === 0 ? decode(repoRootRun.stdout).trim() : context.repoRoot;
  const timestamp = new Date().toISOString();

  const auditRun = await context.process.exec("bun", ["audit", "--json"], {
    cwd: repoRoot,
    timeoutMs: 60_000,
  });
  const findings = bunAuditFindings(`${decode(auditRun.stdout)}${decode(auditRun.stderr)}`);
  const untrustedRun = await context.process.exec("bun", ["pm", "untrusted"], {
    cwd: repoRoot,
    timeoutMs: 60_000,
  });
  const untrusted = untrustedDependencyFinding(
    untrustedRun.exitCode,
    `${decode(untrustedRun.stdout)}${decode(untrustedRun.stderr)}`
  );
  if (untrusted) findings.push(untrusted);

  if (input.mode === "staged") {
    const pathsRun = await context.process.exec(
      "git",
      ["diff", "--cached", "--name-only", "--diff-filter=ACMR"],
      { cwd: repoRoot, timeoutMs: 10_000 }
    );
    if (pathsRun.exitCode === 0) {
      for (const filePath of listedPaths(pathsRun.stdout)) {
        const blobRun = await context.process.exec("git", ["show", `:${filePath}`], {
          cwd: repoRoot,
          timeoutMs: 10_000,
        });
        if (blobRun.exitCode === 0) findings.push(...secretFindings(blobRun.stdout, filePath));
      }
    }
  } else {
    const pathsRun = await context.process.exec("git", ["ls-files"], {
      cwd: repoRoot,
      timeoutMs: 10_000,
    });
    if (pathsRun.exitCode === 0) {
      for (const filePath of listedPaths(pathsRun.stdout)) {
        const raw = await context.fs.readText(context.path.join(repoRoot, filePath));
        if (raw !== null) findings.push(...secretFindings(encoder.encode(raw), filePath));
      }
    }
  }

  const report = securityReport({
    findings: sortFindings(findings),
    mode: input.mode,
    timestamp,
    repoRoot,
  });
  const reportDir = context.path.join(repoRoot, ".rawr", "security");
  await context.fs.mkdir(reportDir);
  const document = securityReportDocument(report);
  const reportPath = context.path.join(reportDir, document.fileName);
  const latestPath = context.path.join(reportDir, "latest.json");
  await context.fs.writeText(reportPath, document.contents);
  await context.fs.writeText(latestPath, document.contents);
  return { ...report, reportPath };
});
