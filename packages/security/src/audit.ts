import { execCmd } from "./exec.js";
import type { SecurityFinding } from "./types.js";

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

function normalizeSeverity(s: string | undefined): SecurityFinding["severity"] {
  const v = (s ?? "").toLowerCase();
  if (v === "critical") return "critical";
  if (v === "high") return "high";
  if (v === "moderate" || v === "medium") return "medium";
  if (v === "low") return "low";
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
    for (const adv of advisories) {
      findings.push({
        kind: "vulnerability",
        severity: normalizeSeverity(adv.severity),
        packageName,
        title: adv.title ?? "Vulnerability advisory",
        url: adv.url,
        advisoryId: adv.id,
        vulnerableVersions: adv.vulnerable_versions,
        cvssScore: adv.cvss?.score,
        cwe: adv.cwe,
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
  const r = await execCmd("bun", ["audit", "--json"], { cwd: repoRoot, timeoutMs: 60_000 });
  const rawOutput = Buffer.concat([r.stdout, r.stderr]).toString("utf8");
  const json = parseBunAuditJsonOutput(rawOutput);
  const findings = bunAuditJsonToFindings(json);
  return { ok: r.exitCode === 0, findings, rawOutput };
}

