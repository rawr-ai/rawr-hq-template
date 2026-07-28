import { afterAll, describe, expect, it } from "bun:test";
import { cp, mkdir, symlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { provisionHabitatBinary } from "./provision.mjs";
import { createHabitatTestRoot, removeHabitatTestRoot } from "./test-fixture.mjs";

const REPOSITORY_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const TEMP_PREFIX = "rawr-habitat-service-test-";
const roots = /** @type {string[]} */ ([]);
const binary = await provisionHabitatBinary();

/**
 * @typedef {{
 *   code?: string,
 *   path: string,
 *   line?: number,
 * }} HabitatDiagnostic
 */

/**
 * @typedef {{
 *   ruleId: string,
 *   disposition: { kind: string },
 *   diagnostics: HabitatDiagnostic[],
 * }} HabitatRuleReport
 */

/**
 * @typedef {{
 *   ok: boolean,
 *   rules: HabitatRuleReport[],
 * }} HabitatReport
 */

afterAll(async () => {
  for (const root of roots.splice(0)) {
    await removeHabitatTestRoot(root, TEMP_PREFIX);
  }
});

/**
 * Creates a committed repository fixture consumed by the native Habitat
 * evaluator. The fixture does not parse or duplicate blueprint law.
 *
 * @param {Record<string, string>} files
 * @param {string[]} rules
 * @param {Record<string, string>} [ruleBlueprints]
 */
async function createFixture(files, rules, ruleBlueprints = {}) {
  const root = await createHabitatTestRoot(TEMP_PREFIX);
  roots.push(root);

  await mkdir(join(root, ".habitat"), { recursive: true });
  await cp(join(REPOSITORY_ROOT, ".habitat", "index.json"), join(root, ".habitat", "index.json"));
  await mkdir(join(root, "services"), { recursive: true });
  await mkdir(join(root, "plugins", "server", "api"), { recursive: true });
  await symlink(join(REPOSITORY_ROOT, "node_modules"), join(root, "node_modules"), "dir");
  for (const rule of rules) {
    const blueprint = ruleBlueprints[rule] ?? "service";
    await cp(
      join(REPOSITORY_ROOT, ".habitat", "blueprints", blueprint, rule),
      join(root, ".habitat", "blueprints", blueprint, rule),
      { recursive: true }
    );
  }
  for (const [relativePath, contents] of Object.entries(files)) {
    const destination = join(root, relativePath);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, contents);
  }
  await writeFile(join(root, "plugins", "server", "api", "__fixture__.ts"), "export {};");

  for (const command of [
    ["git", "init", "--quiet"],
    ["git", "add", "."],
    [
      "git",
      "-c",
      "user.name=Habitat Test",
      "-c",
      "user.email=habitat-test@example.invalid",
      "commit",
      "--quiet",
      "--no-gpg-sign",
      "-m",
      "Create fixture",
    ],
  ]) {
    const result = Bun.spawnSync(command, { cwd: root });
    if (result.exitCode !== 0) {
      throw new Error(`Unable to prepare Habitat fixture: ${result.stderr}`);
    }
  }

  return root;
}

/** @param {string} root @param {string[]} rules */
async function check(root, rules) {
  const child = Bun.spawn(
    [binary, "check", "--repo-root", root, "--json", ...rules.flatMap((rule) => ["--rule", rule])],
    { stdout: "pipe", stderr: "pipe" }
  );
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (stdout.length === 0) {
    throw new Error(`Habitat emitted no JSON (exit ${exitCode}): ${stderr}`);
  }
  const report = /** @type {HabitatReport} */ (JSON.parse(stdout));
  const providerFailure = report.rules.find((rule) =>
    ["dependency-refused", "execution-failed", "selector-refused"].includes(rule.disposition.kind)
  );
  if (providerFailure !== undefined) {
    throw new Error(
      `${providerFailure.ruleId} provider failure: ${JSON.stringify(providerFailure.diagnostics)}`
    );
  }
  return { exitCode, report };
}

/** @param {HabitatReport} report @param {string} ruleId */
function diagnostics(report, ruleId) {
  return report.rules.find((rule) => rule.ruleId === ruleId)?.diagnostics ?? [];
}

const serviceTopology = "require_service_spine_topology";
const databaseTopology = "require_service_database_topology";
const topologyRules = [serviceTopology, databaseTopology];
const topologyBlueprints = { [databaseTopology]: "database" };

/** @returns {Record<string, string>} */
function canonicalTopology() {
  return {
    "services/orders/AGENTS.md": "# Orders",
    "services/orders/package.json": "{}",
    "services/orders/project.json": "{}",
    "services/orders/tsconfig.json": "{}",
    "services/orders/vitest.config.ts": "export default {};",
    "services/orders/src/client.ts": "export {};",
    "services/orders/src/service/base.ts": "export const base = {};",
    "services/orders/src/service/contract.ts": "export const contract = {};",
    "services/orders/src/service/impl.ts": "export const impl = {}; export const service = {};",
    "services/orders/src/service/router.ts": "export const router = {};",
    "services/orders/src/service/model/entities/order.ts": "export const order = {};",
    "services/orders/src/service/model/dto/create-order.ts": "export const createOrder = {};",
    "services/orders/src/service/modules/catalog/AGENTS.md": "# Catalog",
    "services/orders/src/service/modules/catalog/contract/index.ts": "export const contract = {};",
    "services/orders/src/service/modules/catalog/contract/find.ts": "export const find = {};",
    "services/orders/src/service/modules/catalog/middleware/index.ts":
      'export { authorize } from "./authorize";',
    "services/orders/src/service/modules/catalog/middleware/authorize.ts":
      "export const authorize = {};",
    "services/orders/src/service/modules/catalog/model/entities/catalog-item.ts":
      "export const catalogItem = {};",
    "services/orders/src/service/modules/catalog/model/dto/find-result.ts":
      "export const findResult = {};",
    "services/orders/src/service/modules/catalog/module.ts": "export const module = {};",
    "services/orders/src/service/modules/catalog/router/index.ts":
      'export { find } from "./find"; export const router = {};',
    "services/orders/src/service/modules/catalog/router/find.ts": "export const find = {};",
    "services/orders/src/service/db/migrations/0001-orders.sql": "select 1;",
    "services/orders/src/service/db/schema/orders.ts": "export const orders = {};",
    "services/orders/src/service/db/stores/orders.ts": "export const orders = {};",
    "plugins/server/api/catalog/src/service/base.ts": "export type Context = {};",
    "plugins/server/api/catalog/src/service/contract.ts": "export const contract = {};",
    "plugins/server/api/catalog/src/service/impl.ts": "export const impl = {};",
    "plugins/server/api/catalog/src/service/router.ts": "export const router = {};",
    "plugins/server/api/catalog/src/service/modules/search/AGENTS.md": "# Search",
    "plugins/server/api/catalog/src/service/modules/search/contract/index.ts":
      "export const contract = {};",
    "plugins/server/api/catalog/src/service/modules/search/contract/find.ts":
      "export const find = {};",
    "plugins/server/api/catalog/src/service/modules/search/middleware/index.ts":
      'export { authorize } from "./authorize";',
    "plugins/server/api/catalog/src/service/modules/search/middleware/authorize.ts":
      "export const authorize = {};",
    "plugins/server/api/catalog/src/service/modules/search/module.ts": "export const module = {};",
    "plugins/server/api/catalog/src/service/modules/search/router/index.ts":
      'export { find } from "./find"; export const router = {};',
    "plugins/server/api/catalog/src/service/modules/search/router/find.ts":
      "export const find = {};",
  };
}

describe("service and database blueprint topology", () => {
  it("admits Template package metadata, directory entrypoints, entities, and root database ownership", async () => {
    const root = await createFixture(canonicalTopology(), topologyRules, topologyBlueprints);
    const result = await check(root, topologyRules);

    expect(result.exitCode).toBe(0);
    expect(diagnostics(result.report, serviceTopology)).toEqual([]);
    expect(diagnostics(result.report, databaseTopology)).toEqual([]);
  });

  it("rejects flat module faces, absent entrypoints, junk model kinds, and misplaced database roles", async () => {
    const files = canonicalTopology();
    delete files["services/orders/src/service/modules/catalog/AGENTS.md"];
    delete files["services/orders/src/service/modules/catalog/contract/index.ts"];
    delete files["services/orders/src/service/modules/catalog/middleware/index.ts"];
    delete files["services/orders/src/service/modules/catalog/router/index.ts"];
    delete files["services/orders/src/service/db/stores/orders.ts"];
    files["services/orders/src/service/modules/catalog/contract.ts"] =
      "export const contract = {};";
    files["services/orders/src/service/modules/catalog/router.ts"] = "export const router = {};";
    files["services/orders/src/service/modules/catalog/model/shared/value.ts"] = "export {};";
    files["services/orders/src/service/modules/catalog/db/stores/catalog.ts"] = "export {};";
    files["services/orders/src/service/db/dto/order.ts"] = "export {};";
    files["services/orders/src/service/db/stores/orders.store.ts"] = "export {};";

    const root = await createFixture(files, topologyRules, topologyBlueprints);
    const result = await check(root, topologyRules);
    const servicePaths = diagnostics(result.report, serviceTopology).map(({ path }) => path);
    const databasePaths = diagnostics(result.report, databaseTopology).map(({ path }) => path);

    expect(result.exitCode).toBe(0);
    expect(servicePaths).toContain("services/orders/src/service/modules/catalog");
    expect(servicePaths).toContain("services/orders/src/service/modules/catalog/contract");
    expect(servicePaths).toContain("services/orders/src/service/modules/catalog/middleware");
    expect(servicePaths).toContain("services/orders/src/service/modules/catalog/router");
    expect(servicePaths).toContain("services/orders/src/service/modules/catalog/contract.ts");
    expect(servicePaths).toContain("services/orders/src/service/modules/catalog/router.ts");
    expect(servicePaths).toContain("services/orders/src/service/modules/catalog/model/shared");
    expect(databasePaths).toContain("services/orders/src/service/modules/catalog/db/stores");
    expect(databasePaths).toContain("services/orders/src/service/db/dto");
    expect(databasePaths).toContain("services/orders/src/service/db/stores/orders.store.ts");
  });
});
