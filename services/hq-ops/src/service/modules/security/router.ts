import type { HqOpsResources } from "../../shared/ports/resources";
import { runBunAudit, runBunPmUntrusted } from "./lib/audit";
import { getRepoRoot } from "./lib/process";
import {
  maxFindingSeverity,
  readLatestSecurityReport,
  securityReport,
  severityRank,
  sortFindings,
  toleranceToMaxSeverity,
  writeSecurityReport,
} from "./lib/reporting";
import { scanSecretsRepo, scanSecretsStaged } from "./lib/secrets";
import { module } from "./module";
import type { SecurityFinding, SecurityMode } from "./types";

async function collectSecurityFindings(
  resources: HqOpsResources,
  repoRoot: string,
  mode: SecurityMode,
): Promise<SecurityFinding[]> {
  const findings: SecurityFinding[] = [];
  findings.push(...(await runBunAudit(resources, repoRoot)));

  const untrusted = await runBunPmUntrusted(resources, repoRoot);
  if (untrusted) findings.push(untrusted);

  if (mode === "staged") {
    findings.push(...(await scanSecretsStaged(resources, repoRoot)));
  } else {
    findings.push(...(await scanSecretsRepo(resources, repoRoot)));
  }

  return sortFindings(findings);
}

const securityCheck = module.securityCheck.handler(async ({ context, input }) => {
  const repoRoot = (await getRepoRoot(context.deps.resources, context.scope.repoRoot)) ?? context.scope.repoRoot;
  const timestamp = new Date().toISOString();
  const findings = await collectSecurityFindings(context.deps.resources, repoRoot, input.mode);
  const report = securityReport({ findings, mode: input.mode, timestamp, repoRoot });
  const { reportPath } = await writeSecurityReport(context.deps.resources, { repoRoot, report });
  return { ...report, reportPath };
});

const gateEnable = module.gateEnable.handler(async ({ context, input }) => {
  const repoRoot = (await getRepoRoot(context.deps.resources, context.scope.repoRoot)) ?? context.scope.repoRoot;
  const timestamp = new Date().toISOString();
  const findings = await collectSecurityFindings(context.deps.resources, repoRoot, input.mode);
  const baseReport = securityReport({ findings, mode: input.mode, timestamp, repoRoot });
  const { reportPath } = await writeSecurityReport(context.deps.resources, { repoRoot, report: baseReport });
  const report = {
    ok: baseReport.ok,
    findings: baseReport.findings,
    summary: baseReport.summary,
    timestamp: baseReport.timestamp,
    mode: input.mode,
    meta: { pluginId: input.pluginId, repoRoot: baseReport.meta?.repoRoot },
    reportPath,
  };

  if (report.ok) return { allowed: true, report, requiresForce: false };
  if (input.riskTolerance === "strict") return { allowed: false, report, requiresForce: true };

  const maxAllowed = toleranceToMaxSeverity(input.riskTolerance);
  if (!maxAllowed) return { allowed: false, report, requiresForce: true };

  const allowed = severityRank(maxFindingSeverity(report.findings)) <= severityRank(maxAllowed);
  return { allowed, report, requiresForce: !allowed };
});

const getSecurityReport = module.getSecurityReport.handler(async ({ context }) => {
  const repoRoot = (await getRepoRoot(context.deps.resources, context.scope.repoRoot)) ?? context.scope.repoRoot;
  return await readLatestSecurityReport(context.deps.resources, repoRoot);
});

export const router = module.router({
  securityCheck,
  gateEnable,
  getSecurityReport,
});
