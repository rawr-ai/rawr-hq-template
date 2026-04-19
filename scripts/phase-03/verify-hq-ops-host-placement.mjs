#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const allowedCreateClientImports = new Set([
  "apps/server/src/host-satisfiers.ts",
  "apps/cli/src/lib/hq-ops-client.ts",
  "plugins/cli/plugins/src/lib/hq-ops-client.ts",
  "services/hq-ops/src/client.ts",
]);

function toPosix(input) {
  return input.split(path.sep).join("/");
}

async function walk(dirPath, files) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const nextPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "dist" || entry.name === "node_modules") continue;
      await walk(nextPath, files);
      continue;
    }
    if (entry.isFile() && /\.(?:[cm]?[jt]sx?)$/.test(entry.name)) {
      files.push(nextPath);
    }
  }
}

function parseImports(filePath, source) {
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const imports = [];

  function visit(node) {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
      const names = [];
      if (node.importClause?.name) names.push(node.importClause.name.text);
      if (node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
        for (const el of node.importClause.namedBindings.elements) {
          names.push(el.propertyName?.text ?? el.name.text);
        }
      }
      imports.push({
        specifier: node.moduleSpecifier.text,
        names,
      });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return imports;
}

const files = [];
await walk(root, files);

const findings = [];

for (const absPath of files.sort()) {
  const relPath = toPosix(path.relative(root, absPath));
  const source = await fs.readFile(absPath, "utf8");
  const imports = parseImports(relPath, source);

  for (const imp of imports) {
    if (relPath.startsWith("packages/agent-config-sync-host/") && imp.specifier.startsWith("@rawr/hq-ops")) {
      findings.push(`${relPath} must not import ${imp.specifier}`);
    }

    if (imp.specifier === "@rawr/hq-ops" && imp.names.includes("createClient") && !allowedCreateClientImports.has(relPath)) {
      findings.push(`${relPath} imports createClient from @rawr/hq-ops outside the sanctioned host roots`);
    }
  }
}

for (const forbiddenPath of [
  "services/hq-ops/src/bin",
  "services/hq-ops/src/service/modules/repo-state/storage.ts",
  "services/hq-ops/src/service/modules/repo-state/support.ts",
  "services/hq-ops/src/service/modules/journal/sqlite.ts",
  "services/hq-ops/src/service/modules/journal/support.ts",
  "services/hq-ops/src/service/modules/journal/writer.ts",
  "services/hq-ops/src/service/modules/security/exec.ts",
  "services/hq-ops/src/service/modules/security/report.ts",
  "services/hq-ops/src/service/modules/security/secrets.ts",
  "services/hq-ops/src/service/modules/security/support.ts",
]) {
  try {
    await fs.stat(path.join(root, forbiddenPath));
    findings.push(`${forbiddenPath} must not exist`);
  } catch {
    // expected missing path
  }
}

try {
  await fs.stat(path.join(root, "packages/hq-ops-host/src/index.ts"));
} catch {
  findings.push("packages/hq-ops-host/src/index.ts is missing");
}

if (findings.length > 0) {
  console.error("verify-hq-ops-host-placement failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("verify-hq-ops-host-placement: OK");
