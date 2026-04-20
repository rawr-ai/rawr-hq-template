import type { HqOpsResources } from "../../../shared/ports/resources";
import type { SecurityFinding } from "../types";
import { bytesToText } from "./process";

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

function parseBunAuditJsonOutput(output: string): BunAuditJson {
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

function bunAuditJsonToFindings(json: BunAuditJson): SecurityFinding[] {
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

export async function runBunAudit(resources: HqOpsResources, repoRoot: string): Promise<SecurityFinding[]> {
  const result = await resources.process.exec("bun", ["audit", "--json"], { cwd: repoRoot, timeoutMs: 60_000 });
  const rawOutput = `${bytesToText(result.stdout)}${bytesToText(result.stderr)}`;
  const json = parseBunAuditJsonOutput(rawOutput);
  return bunAuditJsonToFindings(json);
}

function parseUntrustedCount(output: string): number | null {
  const match = output.match(/Found\s+(\d+)\s+untrusted dependencies with scripts/i);
  if (!match) return null;
  return Number(match[1]);
}

export async function runBunPmUntrusted(resources: HqOpsResources, repoRoot: string): Promise<SecurityFinding | null> {
  const result = await resources.process.exec("bun", ["pm", "untrusted"], { cwd: repoRoot, timeoutMs: 60_000 });
  const rawOutput = `${bytesToText(result.stdout)}${bytesToText(result.stderr)}`.trim();
  const count = parseUntrustedCount(rawOutput);

  if (result.exitCode !== 0) {
    return {
      kind: "untrustedDependencyScripts",
      severity: "high",
      count: count ?? -1,
      rawOutput: rawOutput.slice(0, 10_000),
    };
  }

  if (count && count > 0) {
    return {
      kind: "untrustedDependencyScripts",
      severity: "high",
      count,
      rawOutput: rawOutput.slice(0, 10_000),
    };
  }

  return null;
}
