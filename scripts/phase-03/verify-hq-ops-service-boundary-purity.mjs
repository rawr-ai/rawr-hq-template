#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const boundaryRoot = path.join(root, "services", "hq-ops", "src", "service");
const boundaryFilePattern = /(\/|^)(contract|schemas|model|types)\.ts$/;
const bannedRelativeImportPattern = /(^|\/)(support|repository|storage|exec|sqlite|writer)(\.[cm]?[jt]sx?)?$/;

function toPosix(input) {
  return input.split(path.sep).join("/");
}

async function walk(dirPath, files) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const nextPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await walk(nextPath, files);
      continue;
    }
    if (entry.isFile() && boundaryFilePattern.test(toPosix(path.relative(root, nextPath)))) {
      files.push(nextPath);
    }
  }
}

function collectModuleSpecifiers(filePath, source) {
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const specifiers = [];

  function visit(node) {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
      specifiers.push(node.moduleSpecifier.text);
    }

    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
      specifiers.push(node.moduleSpecifier.text);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specifiers;
}

export async function findHqOpsServiceBoundaryPurityFindings() {
  const files = [];
  await walk(boundaryRoot, files);

  const findings = [];

  for (const absPath of files.sort()) {
    const relPath = toPosix(path.relative(root, absPath));
    const source = await fs.readFile(absPath, "utf8");
    const specifiers = collectModuleSpecifiers(relPath, source);

    for (const specifier of specifiers) {
      if (specifier.startsWith("node:") || specifier.startsWith("bun:")) {
        findings.push(`${relPath} imports runtime module ${specifier}`);
        continue;
      }

      if (bannedRelativeImportPattern.test(specifier)) {
        findings.push(`${relPath} imports runtime helper ${specifier}`);
      }
    }
  }

  return findings;
}

if (import.meta.main) {
  const findings = await findHqOpsServiceBoundaryPurityFindings();

  if (findings.length > 0) {
    console.error("verify-hq-ops-service-boundary-purity failed:");
    for (const finding of findings) {
      console.error(`- ${finding}`);
    }
    process.exit(1);
  }

  console.log("verify-hq-ops-service-boundary-purity: OK");
}
