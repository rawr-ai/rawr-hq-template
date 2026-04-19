#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dir, "..", "..");

const SCANNED_ROOTS = [
  "apps/cli/src",
  "apps/server/src",
  "plugins/cli/chatgpt-corpus/src",
  "plugins/cli/plugins/src",
  "plugins/cli/session-tools/src",
];

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"]);
const SKIP_DIRS = new Set(["dist", "node_modules", "coverage", ".nx", ".git", "test", "tests", "__tests__"]);

const FORBIDDEN_PATTERNS = [
  {
    pattern: /\b(?:export\s+)?function\s+createInvocation\s*\(/u,
    message: "production projections must not define local createInvocation helpers",
  },
  {
    pattern: /\bcreateServiceInvocationOptions\b/u,
    message: "production projections must rely on client-derived call option types, not the generic service invocation helper",
  },
  {
    pattern: /\bcallProcedure\s*\(/u,
    message: "production projections must not dispatch service procedures through untyped callProcedure helpers",
  },
  {
    pattern: /\bprocedure:\s*unknown\b/u,
    message: "production projections must not erase procedure types to unknown",
  },
  {
    pattern: /\brawClient:\s*unknown\b/u,
    message: "production projections must not erase service clients to unknown",
  },
  {
    pattern: /\brawClient\s+as\s+any\b/u,
    message: "production projections must not cast service clients to any",
  },
  {
    pattern: /\braw\?\.(?:catalog|search|transcripts|planning|execution|retirement|workspace|corpusArtifacts)\b/u,
    message: "production projections must not optional-probe raw service procedure trees",
  },
];

const FORBIDDEN_AGENT_CONFIG_SYNC_CASTS = [
  "sourcePlugin: input.sourcePlugin as any",
  "content: input.content as any",
  "scope: input.scope as any",
  "as Promise<SyncRunResult>",
];

async function pathExists(relPath) {
  try {
    await fs.stat(path.join(root, relPath));
    return true;
  } catch {
    return false;
  }
}

async function walk(relPath, files) {
  if (!(await pathExists(relPath))) return;
  const entries = await fs.readdir(path.join(root, relPath), { withFileTypes: true });

  for (const entry of entries) {
    const child = path.posix.join(relPath, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walk(child, files);
      continue;
    }

    if (!entry.isFile()) continue;
    if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) continue;
    files.push(child);
  }
}

function findUntypedInlineInvocation(relPath, source) {
  const findings = [];
  const pattern = /context:\s*\{\s*invocation\s*:/gu;
  for (const match of source.matchAll(pattern)) {
    const window = source.slice(match.index, match.index + 500);
    if (!window.includes("satisfies")) {
      findings.push(`${relPath} contains inline invocation options without a nearby satisfies type check`);
    }
  }
  return findings;
}

const files = [];
for (const relPath of SCANNED_ROOTS) {
  await walk(relPath, files);
}

const findings = [];
for (const relPath of files.sort()) {
  const source = await fs.readFile(path.join(root, relPath), "utf8");

  for (const { pattern, message } of FORBIDDEN_PATTERNS) {
    if (pattern.test(source)) findings.push(`${relPath}: ${message}`);
  }

  if (relPath === "plugins/cli/plugins/src/lib/agent-config-sync.ts") {
    for (const forbidden of FORBIDDEN_AGENT_CONFIG_SYNC_CASTS) {
      if (source.includes(forbidden)) findings.push(`${relPath}: forbidden weak service input cast remains: ${forbidden}`);
    }
  }

  findings.push(...findUntypedInlineInvocation(relPath, source));
}

if (findings.length > 0) {
  console.error("verify-projection-boundary-invocation: FAILED");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("verify-projection-boundary-invocation: OK");
