import { execCmd } from "./exec";
import type { SecurityFinding } from "./runtime";

type BunAuditAdvisory = {
  id?: number;
  url?: string;
  title?: string;
  severity?: string;
  vulnerable_versions?: string;
  cwe?: string[];
  cvss?: { score?: number; vectorString?: string | null };
};

type BunAuditJson = Record<string, BunAuditAdvisory[]>;

function extractJsonObject(mixed: string): string | null {
  const first = mixed.indexOf("{");
  const last = mixed.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  return mixed.slice(first, last + 1);
}

function normalizeSeverity(value: string | undefined): SecurityFinding["severity"] {
  const normalized = (value ?? "").toLowerCase();
  if (normalized === "critical") return "critical";
  if (normalized === "high") return "high";
  if (normalized === "moderate" || normalized === "medium") return "medium";
  if (normalized === "low") return "low";
  return "info";
}

export function parseBunAuditJsonOutput(output: string): BunAuditJson {
  const jsonText = extractJsonObject(output);
  if (!jsonText) return {};
  try {
    const parsed = JSON.parse(jsonText) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as BunAuditJson;
  } catch {
    return {};
  }
}

export function bunAuditJsonToFindings(json: BunAuditJson): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  const packages = Object.keys(json).sort((a, b) => a.localeCompare(b));
  for (const packageName of packages) {
    const advisories = (json[packageName] ?? []).slice();
    advisories.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
    for (const advisory of advisories) {
      findings.push({
        kind: "vulnerability",
        severity: normalizeSeverity(advisory.severity),
        packageName,
        title: advisory.title ?? "Vulnerability advisory",
        url: advisory.url,
        advisoryId: advisory.id,
        vulnerableVersions: advisory.vulnerable_versions,
        cvssScore: advisory.cvss?.score,
        cwe: advisory.cwe,
      });
    }
  }
  return findings;
}

export async function runBunAudit(repoRoot: string): Promise<{
  ok: boolean;
  findings: SecurityFinding[];
  rawOutput: string;
}> {
  const result = await execCmd("bun", ["audit", "--json"], { cwd: repoRoot, timeoutMs: 60_000 });
  const rawOutput = Buffer.concat([result.stdout, result.stderr]).toString("utf8");
  const json = parseBunAuditJsonOutput(rawOutput);
  const findings = bunAuditJsonToFindings(json);
  return { ok: result.exitCode === 0, findings, rawOutput };
}
