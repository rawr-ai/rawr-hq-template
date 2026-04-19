import type { HqOpsResources } from "../../shared/ports/resources";
import type {
  GateEnableResult,
  RiskTolerance,
  SecurityFinding,
  SecurityMode,
  SecurityReport,
} from "./types.js";

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

type SecretPattern = { id: string; re: RegExp; severity?: "high" | "critical" };

const DEFAULT_SECRET_PATTERNS: SecretPattern[] = [
  { id: "aws-access-key-id", re: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g, severity: "high" },
  { id: "github-pat", re: /\bghp_[A-Za-z0-9]{36}\b/g, severity: "high" },
  { id: "github-pat-fine", re: /\bgithub_pat_[A-Za-z0-9_]{80,}\b/g, severity: "high" },
  { id: "slack-token", re: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/g, severity: "high" },
  {
    id: "private-key-header",
    re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    severity: "critical",
  },
  { id: "openai-key", re: /\bsk-(?:proj-)?[A-Za-z0-9]{32,}\b/g, severity: "high" },
  { id: "google-api-key", re: /\bAIzaSy[0-9A-Za-z_-]{35}\b/g, severity: "high" },
];

const DEFAULT_MAX_REPORT_BYTES = 250_000;

function bytesToText(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("utf8");
}

async function git(
  resources: HqOpsResources,
  args: string[],
  opts: { cwd?: string; timeoutMs?: number } = {},
): Promise<{ ok: boolean; stdout: Uint8Array; stderr: Uint8Array; exitCode: number | null }> {
  const result = await resources.process.exec("git", args, { cwd: opts.cwd, timeoutMs: opts.timeoutMs });
  return {
    ok: result.exitCode === 0,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
  };
}

async function getRepoRoot(resources: HqOpsResources, cwd: string): Promise<string | null> {
  const result = await git(resources, ["rev-parse", "--show-toplevel"], { cwd, timeoutMs: 5_000 });
  if (!result.ok) return null;
  return bytesToText(result.stdout).trim();
}

async function listStagedPaths(resources: HqOpsResources, repoRoot: string): Promise<string[]> {
  const result = await git(resources, ["diff", "--cached", "--name-only", "--diff-filter=ACMR"], {
    cwd: repoRoot,
    timeoutMs: 10_000,
  });
  if (!result.ok) return [];
  return bytesToText(result.stdout).split("\n").map((value) => value.trim()).filter(Boolean);
}

async function readStagedBlob(resources: HqOpsResources, repoRoot: string, filePath: string): Promise<Uint8Array | null> {
  const result = await git(resources, ["show", `:${filePath}`], { cwd: repoRoot, timeoutMs: 10_000 });
  if (!result.ok) return null;
  return result.stdout;
}

async function listRepoFiles(resources: HqOpsResources, repoRoot: string): Promise<string[]> {
  const result = await git(resources, ["ls-files"], { cwd: repoRoot, timeoutMs: 10_000 });
  if (!result.ok) return [];
  return bytesToText(result.stdout).split("\n").map((value) => value.trim()).filter(Boolean);
}

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

async function runBunAudit(resources: HqOpsResources, repoRoot: string): Promise<SecurityFinding[]> {
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

async function runBunPmUntrusted(resources: HqOpsResources, repoRoot: string): Promise<SecurityFinding | null> {
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

function looksBinary(buf: Uint8Array): boolean {
  const sample = buf.subarray(0, Math.min(buf.length, 4096));
  return sample.includes(0);
}

function findMatches(text: string, pattern: SecretPattern): Array<{ match: string; index: number }> {
  const matches: Array<{ match: string; index: number }> = [];
  const flags = pattern.re.flags.includes("g") ? pattern.re.flags : `${pattern.re.flags}g`;
  const re = new RegExp(pattern.re.source, flags);

  for (;;) {
    const match = re.exec(text);
    if (!match) break;
    matches.push({ match: match[0], index: match.index });
    if (match.index === re.lastIndex) re.lastIndex += 1;
  }

  return matches;
}

async function scanSecretsStaged(resources: HqOpsResources, repoRoot: string): Promise<SecurityFinding[]> {
  const maxFileBytes = 256_000;
  const stagedPaths = await listStagedPaths(resources, repoRoot);

  const findings: SecurityFinding[] = [];
  for (const filePath of stagedPaths) {
    const blob = await readStagedBlob(resources, repoRoot, filePath);
    if (!blob) continue;
    const buf = blob.subarray(0, Math.min(blob.length, maxFileBytes));
    if (looksBinary(buf)) continue;

    const text = bytesToText(buf);
    for (const pattern of DEFAULT_SECRET_PATTERNS) {
      for (const match of findMatches(text, pattern)) {
        findings.push({
          kind: "secret",
          severity: pattern.severity ?? "critical",
          path: filePath,
          patternId: pattern.id,
          match: match.match,
          index: match.index,
        });
      }
    }
  }

  return findings;
}

async function scanSecretsRepo(resources: HqOpsResources, repoRoot: string): Promise<SecurityFinding[]> {
  const maxFileBytes = 256_000;
  const files = await listRepoFiles(resources, repoRoot);

  const findings: SecurityFinding[] = [];
  for (const filePath of files) {
    const absPath = resources.path.join(repoRoot, filePath);
    const raw = await resources.fs.readText(absPath);
    if (raw === null) continue;
    const buf = Buffer.from(raw).subarray(0, maxFileBytes);
    if (looksBinary(buf)) continue;

    const text = bytesToText(buf);
    for (const pattern of DEFAULT_SECRET_PATTERNS) {
      for (const match of findMatches(text, pattern)) {
        findings.push({
          kind: "secret",
          severity: pattern.severity ?? "critical",
          path: filePath,
          patternId: pattern.id,
          match: match.match,
          index: match.index,
        });
      }
    }
  }

  return findings;
}

function severityRank(severity: SecurityFinding["severity"]): number {
  switch (severity) {
    case "info":
      return 0;
    case "low":
      return 1;
    case "medium":
      return 2;
    case "high":
      return 3;
    case "critical":
      return 4;
  }
}

function summarize(findings: SecurityFinding[]): string {
  const vulns = findings.filter((finding) => finding.kind === "vulnerability").length;
  const untrusted = findings.filter((finding) => finding.kind === "untrustedDependencyScripts").length;
  const secrets = findings.filter((finding) => finding.kind === "secret").length;
  return `vulns=${vulns}, untrusted=${untrusted}, secrets=${secrets}`;
}

function sortFindings(findings: SecurityFinding[]): SecurityFinding[] {
  const kindOrder: Record<SecurityFinding["kind"], number> = {
    secret: 0,
    untrustedDependencyScripts: 1,
    vulnerability: 2,
    toolError: 3,
  };

  return findings.slice().sort((a, b) => {
    const kind = kindOrder[a.kind] - kindOrder[b.kind];
    if (kind !== 0) return kind;

    const severity = severityRank(b.severity) - severityRank(a.severity);
    if (severity !== 0) return severity;

    if (a.kind === "secret" && b.kind === "secret") {
      const filePath = a.path.localeCompare(b.path);
      if (filePath !== 0) return filePath;
      return a.patternId.localeCompare(b.patternId);
    }

    if (a.kind === "vulnerability" && b.kind === "vulnerability") {
      const pkg = a.packageName.localeCompare(b.packageName);
      if (pkg !== 0) return pkg;
      return a.title.localeCompare(b.title);
    }

    if (a.kind === "untrustedDependencyScripts" && b.kind === "untrustedDependencyScripts") {
      return b.count - a.count;
    }

    return 0;
  });
}

function safeIsoForFilename(iso: string): string {
  return iso.replaceAll(":", "-").replaceAll(".", "-");
}

function estimateSizeBytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

function capFindings(report: SecurityReport, maxBytes: number): SecurityReport {
  if (estimateSizeBytes(report) <= maxBytes) return report;

  const capped: SecurityReport = {
    ...report,
    findings: report.findings.slice(),
    summary: `${report.summary} (truncated)`,
  };

  capped.findings = capped.findings.map((finding) => {
    if (finding.kind === "untrustedDependencyScripts") {
      return { ...finding, rawOutput: finding.rawOutput?.slice(0, 2_000) };
    }
    if (finding.kind === "secret") {
      return { ...finding, match: finding.match.slice(0, 32) };
    }
    return finding;
  });

  if (estimateSizeBytes(capped) <= maxBytes) return capped;

  let n = Math.min(capped.findings.length, 50);
  for (; n >= 1; n = Math.floor(n / 2)) {
    const attempt: SecurityReport = { ...capped, findings: capped.findings.slice(0, n) };
    if (estimateSizeBytes(attempt) <= maxBytes) return attempt;
  }

  return { ...capped, findings: [] };
}

async function writeSecurityReport(resources: HqOpsResources, opts: {
  repoRoot: string;
  report: SecurityReport;
  maxReportBytes?: number;
}): Promise<{ reportDir: string; reportPath: string; latestPath: string }> {
  const maxBytes = opts.maxReportBytes ?? DEFAULT_MAX_REPORT_BYTES;
  const reportDir = resources.path.join(opts.repoRoot, ".rawr", "security");
  await resources.fs.mkdir(reportDir);

  const capped = capFindings(opts.report, maxBytes);
  const json = JSON.stringify(capped, null, 2);
  const fileName = `report-${safeIsoForFilename(capped.timestamp)}.json`;
  const reportPath = resources.path.join(reportDir, fileName);
  const latestPath = resources.path.join(reportDir, "latest.json");

  await resources.fs.writeText(reportPath, json);
  await resources.fs.writeText(latestPath, json);

  return { reportDir, reportPath, latestPath };
}

async function securityCheck(resources: HqOpsResources, input: {
  mode: SecurityMode;
  cwd?: string;
}): Promise<Pick<SecurityReport, "ok" | "findings" | "summary" | "timestamp" | "mode" | "meta"> & { reportPath?: string }> {
  const startedCwd = input.cwd ?? ".";
  const repoRoot = (await getRepoRoot(resources, startedCwd)) ?? startedCwd;
  const timestamp = new Date().toISOString();

  const findings: SecurityFinding[] = [];
  findings.push(...(await runBunAudit(resources, repoRoot)));

  const untrusted = await runBunPmUntrusted(resources, repoRoot);
  if (untrusted) findings.push(untrusted);

  if (input.mode === "staged") {
    findings.push(...(await scanSecretsStaged(resources, repoRoot)));
  } else {
    findings.push(...(await scanSecretsRepo(resources, repoRoot)));
  }

  const sorted = sortFindings(findings);
  const ok = sorted.length === 0;
  const summary = summarize(sorted);
  const report: SecurityReport = {
    ok,
    findings: sorted,
    summary,
    timestamp,
    mode: input.mode,
    meta: { repoRoot },
  };
  const { reportPath } = await writeSecurityReport(resources, { repoRoot, report });
  return { ok, findings: sorted, summary, timestamp, mode: input.mode, meta: { repoRoot }, reportPath };
}

function toleranceToMaxSeverity(riskTolerance: RiskTolerance): SecurityFinding["severity"] | null {
  switch (riskTolerance) {
    case "off":
      return "critical";
    case "permissive":
      return "high";
    case "balanced":
      return "medium";
    case "strict":
      return null;
  }
}

async function gateEnable(resources: HqOpsResources, input: {
  pluginId: string;
  riskTolerance: RiskTolerance;
  mode: SecurityMode;
  cwd?: string;
}): Promise<GateEnableResult> {
  const base = await securityCheck(resources, { mode: input.mode, cwd: input.cwd });
  const report: GateEnableResult["report"] = {
    ok: base.ok,
    findings: base.findings,
    summary: base.summary,
    timestamp: base.timestamp,
    mode: input.mode,
    meta: { pluginId: input.pluginId, repoRoot: base.meta?.repoRoot },
    reportPath: base.reportPath,
  };

  if (report.ok) return { allowed: true, report, requiresForce: false };
  if (input.riskTolerance === "strict") return { allowed: false, report, requiresForce: true };

  const maxAllowed = toleranceToMaxSeverity(input.riskTolerance);
  if (!maxAllowed) return { allowed: false, report, requiresForce: true };

  const maxFindingSeverity = report.findings.reduce<SecurityFinding["severity"]>(
    (acc, finding) => (severityRank(finding.severity) > severityRank(acc) ? finding.severity : acc),
    "info",
  );

  const allowed = severityRank(maxFindingSeverity) <= severityRank(maxAllowed);
  return { allowed, report, requiresForce: !allowed };
}

async function getSecurityReport(resources: HqOpsResources, input: { cwd: string }): Promise<SecurityReport | null> {
  const repoRoot = (await getRepoRoot(resources, input.cwd)) ?? input.cwd;
  const latestPath = resources.path.join(repoRoot, ".rawr", "security", "latest.json");
  const raw = await resources.fs.readText(latestPath);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as SecurityReport;
  } catch {
    return null;
  }
}

export function createRepository(resources: HqOpsResources, repoRoot: string) {
  return {
    async securityCheck(mode: "staged" | "repo") {
      return await securityCheck(resources, { mode, cwd: repoRoot });
    },
    async gateEnable(pluginId: string, riskTolerance: RiskTolerance, mode: "staged" | "repo") {
      return await gateEnable(resources, { pluginId, riskTolerance, mode, cwd: repoRoot });
    },
    async getSecurityReport() {
      return await getSecurityReport(resources, { cwd: repoRoot });
    },
  };
}
