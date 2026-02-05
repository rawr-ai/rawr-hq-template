import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { listRepoFiles, listStagedPaths, readStagedBlob } from "./git.js";
import type { SecurityFinding } from "./types.js";

export type SecretPattern = { id: string; re: RegExp; severity?: SecurityFinding["severity"] };

// MVP: small, obvious patterns only (favor low false-positive rate).
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
  // OpenAI-style keys; keep strict to avoid catching random "sk-" strings.
  { id: "openai-key", re: /\bsk-(?:proj-)?[A-Za-z0-9]{32,}\b/g, severity: "high" },
  { id: "google-api-key", re: /\bAIzaSy[0-9A-Za-z_-]{35}\b/g, severity: "high" },
];

function looksBinary(buf: Buffer): boolean {
  const sample = buf.subarray(0, Math.min(buf.length, 4096));
  return sample.includes(0);
}

function findMatches(text: string, pattern: SecretPattern): { match: string; index: number }[] {
  const matches: { match: string; index: number }[] = [];
  const flags = pattern.re.flags.includes("g") ? pattern.re.flags : `${pattern.re.flags}g`;
  const re = new RegExp(pattern.re.source, flags);
  for (;;) {
    const m = re.exec(text);
    if (!m) break;
    matches.push({ match: m[0], index: m.index });
    if (m.index === re.lastIndex) re.lastIndex++;
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
  for (const path of stagedPaths) {
    const blob = await readStagedBlob(opts.repoRoot, path);
    if (!blob) continue;
    const buf = blob.subarray(0, Math.min(blob.length, maxFileBytes));
    if (looksBinary(buf)) continue;

    const text = buf.toString("utf8");
    for (const p of patterns) {
      for (const m of findMatches(text, p)) {
        findings.push({
          kind: "secret",
          severity: p.severity ?? "critical",
          path,
          patternId: p.id,
          match: m.match,
          index: m.index,
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
  for (const path of files) {
    const abs = join(opts.repoRoot, path);
    let buf: Buffer;
    try {
      buf = await readFile(abs);
    } catch {
      continue;
    }
    const truncated = buf.subarray(0, Math.min(buf.length, maxFileBytes));
    if (looksBinary(truncated)) continue;

    const text = truncated.toString("utf8");
    for (const p of patterns) {
      for (const m of findMatches(text, p)) {
        findings.push({
          kind: "secret",
          severity: p.severity ?? "critical",
          path,
          patternId: p.id,
          match: m.match,
          index: m.index,
        });
      }
    }
  }

  return findings;
}

