#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

export const root = process.cwd();

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"]);
const SKIP_DIRS = new Set(["node_modules", "dist", ".turbo", ".git", "coverage"]);

export function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function parseAllowFindings() {
  return process.argv.includes("--allow-findings");
}

export async function readFile(relPath) {
  return fs.readFile(path.join(root, relPath), "utf8");
}

export async function readJson(relPath) {
  return JSON.parse(await readFile(relPath));
}

export async function pathExists(relPath) {
  try {
    await fs.access(path.join(root, relPath));
    return true;
  } catch {
    return false;
  }
}

export async function runCommand(command, label = command) {
  const result = Bun.spawnSync({
    cmd: ["/bin/sh", "-lc", command],
    cwd: root,
    stdout: "inherit",
    stderr: "inherit",
    env: process.env,
  });

  if (result.exitCode !== 0) {
    throw new Error(`${label} failed with exit code ${result.exitCode ?? 1}`);
  }
}

function toPosix(input) {
  return input.split(path.sep).join("/");
}

async function walkSourceFiles(relPath, files) {
  const absPath = path.join(root, relPath);
  const entries = await fs.readdir(absPath, { withFileTypes: true });

  for (const entry of entries) {
    const childRelPath = toPosix(path.join(relPath, entry.name));
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walkSourceFiles(childRelPath, files);
      continue;
    }

    if (!entry.isFile()) continue;
    if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) continue;
    files.push(childRelPath);
  }
}

export async function listSourceFiles() {
  const roots = ["apps", "services", "packages", "plugins", "tools"];
  const files = [];

  for (const relPath of roots) {
    if (await pathExists(relPath)) {
      await walkSourceFiles(relPath, files);
    }
  }

  return files.sort();
}

function collectModuleSpecifiers(filePath, source) {
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const specifiers = new Set();

  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      specifiers.add(node.moduleSpecifier.text);
    }

    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0 &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      specifiers.add(node.arguments[0].text);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return [...specifiers].sort();
}

export async function collectImportSites(prefixes) {
  const sourceFiles = await listSourceFiles();
  const sites = [];

  for (const relPath of sourceFiles) {
    const source = await readFile(relPath);
    const specifiers = collectModuleSpecifiers(relPath, source);
    for (const specifier of specifiers) {
      if (prefixes.some((prefix) => specifier === prefix || specifier.startsWith(`${prefix}/`))) {
        sites.push(`${relPath}::${specifier}`);
      }
    }
  }

  return sites.sort();
}

export async function listFilesUnder(relPath) {
  const absPath = path.join(root, relPath);
  const entries = await fs.readdir(absPath, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => toPosix(path.join(relPath, entry.parentPath.slice(absPath.length + 1), entry.name)))
    .sort();
}

export function finishVerification({ allowFindings, failures, successMessage, findingPrefix }) {
  if (failures.length === 0) {
    console.log(successMessage);
    return;
  }

  if (allowFindings) {
    console.log(`${findingPrefix} current findings:`);
    for (const failure of failures) {
      console.log(`- ${failure}`);
    }
    return;
  }

  console.error(`${findingPrefix} failed:`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}
