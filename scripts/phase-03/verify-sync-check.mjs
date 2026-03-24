#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const inventoryPath = path.join(root, "tools", "architecture-inventory", "slice-0-first-cohort.json");
const projectArgIndex = process.argv.indexOf("--project");
const projectFilter = projectArgIndex >= 0 ? process.argv[projectArgIndex + 1] : undefined;

const inventory = JSON.parse(await fs.readFile(inventoryPath, "utf8"));
const projectEntries = Object.entries(inventory.projects);
const selectedEntries = projectFilter
  ? projectEntries.filter(([name]) => name === projectFilter)
  : projectEntries;

if (projectFilter && selectedEntries.length === 0) {
  console.error(`sync:check failed: project ${projectFilter} is not declared in ${path.relative(root, inventoryPath)}.`);
  process.exit(1);
}

function configTargets(config) {
  if ("scripts" in config) return Object.keys(config.scripts ?? {});
  return Object.keys(config.targets ?? {});
}

function configTags(config) {
  if ("nx" in config) return config.nx?.tags ?? [];
  return config.tags ?? [];
}

const failures = [];

for (const [projectName, projectSpec] of selectedEntries) {
  const configPath = path.join(root, projectSpec.config);
  const parsed = JSON.parse(await fs.readFile(configPath, "utf8"));
  const actualTags = new Set(configTags(parsed));
  const actualTargets = new Set(configTargets(parsed));

  for (const tag of projectSpec.tags) {
    if (!actualTags.has(tag)) {
      failures.push(`${projectName} missing tag ${tag}`);
    }
  }

  for (const target of projectSpec.targets) {
    if (!actualTargets.has(target)) {
      failures.push(`${projectName} missing target ${target}`);
    }
  }
}

if (failures.length > 0) {
  console.error("sync:check failed:");
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

console.log(
  `sync:check passed for ${selectedEntries.length} project${selectedEntries.length === 1 ? "" : "s"} using ${path.relative(root, inventoryPath)}.`,
);
