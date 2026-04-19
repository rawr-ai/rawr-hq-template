import { execCmd } from "./exec.js";
import type { SecurityFinding } from "./types.js";

function parseCount(output: string): number | null {
  const m = output.match(/Found\s+(\d+)\s+untrusted dependencies with scripts/i);
  if (!m) return null;
  return Number(m[1]);
}

export async function runBunPmUntrusted(repoRoot: string): Promise<{
  ok: boolean;
  finding: SecurityFinding | null;
  rawOutput: string;
}> {
  const r = await execCmd("bun", ["pm", "untrusted"], { cwd: repoRoot, timeoutMs: 60_000 });
  const rawOutput = Buffer.concat([r.stdout, r.stderr]).toString("utf8").trim();
  const count = parseCount(rawOutput);

  if (r.exitCode !== 0) {
    return {
      ok: false,
      finding: {
        kind: "untrustedDependencyScripts",
        severity: "high",
        count: count ?? -1,
        rawOutput: rawOutput.slice(0, 10_000),
      },
      rawOutput,
    };
  }

  if (count && count > 0) {
    return {
      ok: true,
      finding: {
        kind: "untrustedDependencyScripts",
        severity: "high",
        count,
        rawOutput: rawOutput.slice(0, 10_000),
      },
      rawOutput,
    };
  }

  return { ok: true, finding: null, rawOutput };
}

