#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

export function assertCondition(condition, message) {
  if (!condition) throw new Error(message);
}

export function assertIncludes(source, snippet, message) {
  assertCondition(source.includes(snippet), message);
}

export function assertMatches(source, pattern, message) {
  assertCondition(pattern.test(source), message);
}

export function assertNotMatches(source, pattern, message) {
  assertCondition(!pattern.test(source), message);
}

export function assertScriptEquals(scripts, scriptName, expectedCommand) {
  assertCondition(scripts[scriptName] === expectedCommand, `package.json must define ${scriptName}`);
}

export async function mustExist(relPath) {
  const absPath = path.join(root, relPath);
  try {
    const stat = await fs.stat(absPath);
    assertCondition(stat.isFile(), `${relPath} must be a file`);
  } catch {
    throw new Error(`missing file: ${relPath}`);
  }
}

export async function readFile(relPath) {
  const absPath = path.join(root, relPath);
  return fs.readFile(absPath, "utf8");
}

export async function readPackageScripts() {
  const pkgRaw = await readFile("package.json");
  const pkg = JSON.parse(pkgRaw);
  return pkg.scripts ?? {};
}
