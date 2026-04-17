import { execCmd } from "./exec";
import type { SecurityFinding } from "./runtime";

function parseCount(output: string): number | null {
  const match = output.match(/Found\s+(\d+)\s+untrusted dependencies with scripts/i);
  if (!match) return null;
  return Number(match[1]);
}

export async function runBunPmUntrusted(repoRoot: string): Promise<{
  ok: boolean;
  finding: SecurityFinding | null;
  rawOutput: string;
}> {
  const result = await execCmd("bun", ["pm", "untrusted"], { cwd: repoRoot, timeoutMs: 60_000 });
  const rawOutput = Buffer.concat([result.stdout, result.stderr]).toString("utf8").trim();
  const count = parseCount(rawOutput);

  if (result.exitCode !== 0) {
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
