#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const nameArgIndex = process.argv.indexOf("--name");
const rawName = nameArgIndex >= 0 ? process.argv[nameArgIndex + 1] : "foundry-proof";

function kebabCase(input) {
  return String(input)
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function pascalCase(kebab) {
  return kebab
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("");
}

async function readFile(relPath) {
  return fs.readFile(path.join(root, relPath), "utf8");
}

async function readJson(relPath) {
  return JSON.parse(await readFile(relPath));
}

async function assertFile(relPath) {
  const stat = await fs.stat(path.join(root, relPath));
  if (!stat.isFile()) throw new Error(`expected file: ${relPath}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const capability = kebabCase(rawName);
const pascal = pascalCase(capability);
const paths = {
  serviceRoot: `services/${capability}`,
  serverPluginRoot: `plugins/server/api/${capability}`,
  asyncPluginRoot: `plugins/async/workflows/${capability}`,
};

for (const relPath of [
  `${paths.serviceRoot}/project.json`,
  `${paths.serviceRoot}/package.json`,
  `${paths.serviceRoot}/src/index.ts`,
  `${paths.serviceRoot}/test/service.test.ts`,
  `${paths.serverPluginRoot}/project.json`,
  `${paths.serverPluginRoot}/package.json`,
  `${paths.serverPluginRoot}/src/server.ts`,
  `${paths.serverPluginRoot}/test/server.test.ts`,
  `${paths.asyncPluginRoot}/project.json`,
  `${paths.asyncPluginRoot}/package.json`,
  `${paths.asyncPluginRoot}/src/workflow.ts`,
  `${paths.asyncPluginRoot}/test/workflow.test.ts`,
]) {
  await assertFile(relPath);
}

const [serviceSource, serverSource, asyncSource, generatorSource, generatorsJson, inventory] = await Promise.all([
  readFile(`${paths.serviceRoot}/src/index.ts`),
  readFile(`${paths.serverPluginRoot}/src/server.ts`),
  readFile(`${paths.asyncPluginRoot}/src/workflow.ts`),
  readFile("tools/nx/capability-foundry/generator.cjs"),
  readJson("tools/nx/generators.json"),
  readJson("tools/architecture-inventory/runtime-capability-foundry.json"),
]);

const generatedSources = [serviceSource, serverSource, asyncSource].join("\n");
assert(!generatedSources.includes("@rawr/hq-sdk"), "generated capability slice must not import @rawr/hq-sdk");
assert(serviceSource.includes("defineService"), "service must declare a public SDK service definition");
assert(serviceSource.includes(`export const ${pascal}Service`), "service export is missing");
assert(serverSource.includes("defineServerApiPlugin"), "server plugin must use @rawr/sdk server API declaration");
assert(serverSource.includes("useService"), "server plugin must declare service use");
assert(asyncSource.includes("defineAsyncWorkflowPlugin"), "async plugin must use @rawr/sdk async workflow declaration");
assert(asyncSource.includes("defineWorkflow"), "async plugin must declare a workflow step");
assert(generatorSource.includes("runtime-capability-foundry.json"), "generator must maintain runtime capability inventory");
assert(generatorsJson.generators?.["capability-foundry"]?.implementation === "./capability-foundry/generator.cjs", "generator must be registered");

for (const projectName of [
  `@rawr/${capability}`,
  `plugin-server-api-${capability}`,
  `plugin-async-workflow-${capability}`,
]) {
  assert(inventory.projects?.[projectName], `inventory missing ${projectName}`);
}

console.log(`capability-foundry verified for ${capability}`);
