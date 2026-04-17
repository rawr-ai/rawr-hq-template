import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { listRepoFiles, listStagedPaths, readStagedBlob } from "./git";
import type { SecurityFinding } from "./runtime";

type SecretPattern = { id: string; re: RegExp; severity?: "high" | "critical" };

export const DEFAULT_SECRET_PATTERNS: SecretPattern[] = [
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

function looksBinary(buf: Buffer): boolean {
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

export async function scanSecretsStaged(opts: {
  repoRoot: string;
  patterns?: SecretPattern[];
  maxFileBytes?: number;
}): Promise<SecurityFinding[]> {
  const patterns = opts.patterns ?? DEFAULT_SECRET_PATTERNS;
  const maxFileBytes = opts.maxFileBytes ?? 256_000;
  const stagedPaths = await listStagedPaths(opts.repoRoot);

  const findings: SecurityFinding[] = [];
  for (const filePath of stagedPaths) {
    const blob = await readStagedBlob(opts.repoRoot, filePath);
    if (!blob) continue;
    const buf = blob.subarray(0, Math.min(blob.length, maxFileBytes));
    if (looksBinary(buf)) continue;

    const text = buf.toString("utf8");
    for (const pattern of patterns) {
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

export async function scanSecretsRepo(opts: {
  repoRoot: string;
  patterns?: SecretPattern[];
  maxFileBytes?: number;
}): Promise<SecurityFinding[]> {
  const patterns = opts.patterns ?? DEFAULT_SECRET_PATTERNS;
  const maxFileBytes = opts.maxFileBytes ?? 256_000;
  const files = await listRepoFiles(opts.repoRoot);

  const findings: SecurityFinding[] = [];
  for (const filePath of files) {
    const absPath = join(opts.repoRoot, filePath);
    let buf: Buffer;
    try {
      buf = await readFile(absPath);
    } catch {
      continue;
    }

    const truncated = buf.subarray(0, Math.min(buf.length, maxFileBytes));
    if (looksBinary(truncated)) continue;

    const text = truncated.toString("utf8");
    for (const pattern of patterns) {
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
