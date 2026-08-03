import type { SecurityFinding } from "../dto/security.dto";

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

function looksBinary(buf: Uint8Array): boolean {
  const sample = buf.subarray(0, Math.min(buf.length, 4096));
  return sample.includes(0);
}

function findMatches(
  text: string,
  pattern: SecretPattern
): Array<{ value: string; index: number }> {
  const matches: Array<{ value: string; index: number }> = [];
  const flags = pattern.re.flags.includes("g") ? pattern.re.flags : `${pattern.re.flags}g`;
  const re = new RegExp(pattern.re.source, flags);

  for (;;) {
    const match = re.exec(text);
    if (!match) break;
    matches.push({ value: match[0], index: match.index });
    if (match.index === re.lastIndex) re.lastIndex += 1;
  }

  return matches;
}

function scanTextForSecrets(text: string, filePath: string): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  for (const pattern of DEFAULT_SECRET_PATTERNS) {
    for (const match of findMatches(text, pattern)) {
      findings.push({
        kind: "secret",
        severity: pattern.severity ?? "critical",
        path: filePath,
        patternId: pattern.id,
        index: match.index,
      });
    }
  }
  return findings;
}

/** Scans one bounded file observation for known secret patterns. */
export function secretFindings(
  contents: Uint8Array,
  filePath: string,
  maxFileBytes = 256_000
): SecurityFinding[] {
  const bounded = contents.subarray(0, Math.min(contents.length, maxFileBytes));
  if (looksBinary(bounded)) return [];
  return scanTextForSecrets(new TextDecoder().decode(bounded), filePath);
}
