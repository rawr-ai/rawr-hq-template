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

export function toPosix(input) {
  return input.split(path.sep).join("/");
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

export async function readPackageJson(relPath = "package.json") {
  return readJson(relPath);
}

export async function listDirectChildDirs(relPath) {
  const absPath = path.join(root, relPath);
  const entries = await fs.readdir(absPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => `${relPath}/${entry.name}`)
    .map(toPosix)
    .sort();
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseJsonSection(markdown, heading) {
  const headingToken = `## ${heading}`;
  const startIndex = markdown.indexOf(headingToken);
  assertCondition(startIndex !== -1, `missing section "${heading}" in .context/M1-execution/phase-1-ledger.md`);

  const sectionStart = startIndex + headingToken.length;
  const nextHeadingIndex = markdown.indexOf("\n## ", sectionStart);
  const sectionBody = markdown.slice(sectionStart, nextHeadingIndex === -1 ? markdown.length : nextHeadingIndex);
  const jsonMatch = sectionBody.match(/```json\s*([\s\S]*?)\s*```/);
  assertCondition(Boolean(jsonMatch), `missing json section for "${heading}" in .context/M1-execution/phase-1-ledger.md`);
  return JSON.parse(jsonMatch[1]);
}

export async function readPhase1Ledger() {
  const markdown = await readFile("docs/projects/rawr-final-architecture-migration/.context/M1-execution/phase-1-ledger.md");
  return {
    markdown,
    live: parseJsonSection(markdown, "Live lane"),
    archived: parseJsonSection(markdown, "Archived lane"),
    parked: parseJsonSection(markdown, "Parked lane"),
    reclassified: parseJsonSection(markdown, "Reclassified / target homes"),
    prohibited: parseJsonSection(markdown, "Prohibited directions"),
    verification: parseJsonSection(markdown, "Verification map"),
  };
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

async function listSourceFiles() {
  const roots = ["apps", "services", "packages", "plugins"];
  const files = [];
  for (const relPath of roots) {
    await walkSourceFiles(relPath, files);
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

export function assertExactSet(actual, expected, label) {
  const actualSet = [...new Set(actual)].sort();
  const expectedSet = [...new Set(expected)].sort();
  const actualJoined = actualSet.join("\n");
  const expectedJoined = expectedSet.join("\n");
  assertCondition(
    actualJoined === expectedJoined,
    `${label} drifted.\nExpected:\n${expectedJoined || "(none)"}\n\nActual:\n${actualJoined || "(none)"}`,
  );
}
