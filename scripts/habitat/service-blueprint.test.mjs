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
const contractAuthority = "require_service_contract_authority";
const contractPropertyDescriptions = "require_service_contract_property_descriptions";
const routerAuthorship = "require_service_router_authorship";
const contextBoundaries = "require_service_context_boundaries";
const moduleIsolation = "require_service_module_isolation";

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

describe("service module source direction", () => {
  it("closes service-root, sibling-module, and relative module-boundary imports", async () => {
    const paths = [
      "services/orders/src/service/impl.ts",
      "services/orders/src/service/modules/catalog/module.ts",
      "services/orders/src/service/modules/catalog/model/policy/catalog.ts",
      "services/orders/src/service/modules/catalog/router/get.ts",
      "services/orders/src/service/modules/catalog/contract/get.ts",
      "services/orders/src/service/model/helpers/root.ts",
      "services/orders/src/service/modules/catalog/model/dto/base-bridge.ts",
      "services/orders/src/service/modules/catalog/model/dto/impl-bridge.ts",
    ];
    const root = await createFixture(
      {
        [paths[0]]:
          'import { contract } from "#orders-service/modules/catalog/contract"; export {};',
        [paths[1]]: 'import { queue } from "../queue/module"; export {};',
        [paths[2]]: 'import { queuePolicy } from "../../../queue/model/policy/queue"; export {};',
        [paths[3]]:
          'import { queuePolicy } from "#orders-service/modules/queue/model/policy/queue"; export {};',
        [paths[4]]: 'import { contract } from "#orders-service/contract"; export {};',
        [paths[5]]:
          'import { catalog } from "../../legacy/modules/catalog/model/dto/catalog"; export {};',
        [paths[6]]: 'export { base } from "#orders-service/base";',
        [paths[7]]: 'export { impl } from "#orders-service/impl";',
      },
      [moduleIsolation]
    );
    const result = await check(root, [moduleIsolation]);
    const actualPaths = diagnostics(result.report, moduleIsolation).map(({ path }) => path);

    for (const path of paths) {
      expect(actualPaths).toContain(path);
    }
  });

  it("keeps contract source independent of configured implementation", async () => {
    const path = "services/orders/src/service/modules/catalog/contract/get.ts";
    const root = await createFixture(
      {
        [path]: `
          import { oc } from "@orpc/contract";
          import { Type } from "typebox";
          import { standard } from "#adapters/typebox";
          import { module } from "../module.js";
          export const get = oc.input(standard(Type.Object({
            id: Type.String({ description: "Order identity." }),
          })));
        `,
      },
      [contractAuthority, contractPropertyDescriptions]
    );
    const result = await check(root, [contractAuthority, contractPropertyDescriptions]);

    expect(diagnostics(result.report, contractAuthority).map(({ path }) => path)).toContain(path);
    expect(diagnostics(result.report, contractPropertyDescriptions)).toEqual([]);
  });

  it("leaves foreign package aliases to the public package-boundary law", async () => {
    const paths = [
      "services/orders/src/service/modules/catalog/router/foreign.ts",
      "services/orders/src/service/impl.ts",
    ];
    const root = await createFixture(
      {
        [paths[0]]: 'import { impl } from "#jobs-service/impl"; export {};',
        [paths[1]]:
          'import { catalog } from "#jobs-service/modules/catalog/model/policy/catalog"; export {};',
      },
      [moduleIsolation]
    );
    const result = await check(root, [moduleIsolation]);

    expect(diagnostics(result.report, moduleIsolation)).toEqual([]);
  });

  it("keeps a module router index limited to local operation leaves", async () => {
    const path = "services/orders/src/service/modules/catalog/router/index.ts";
    const root = await createFixture(
      {
        [path]: `
          import { module } from "../module.js";
          import { get } from "./get";
          export const router = { get };
        `,
      },
      [routerAuthorship]
    );
    const result = await check(root, [routerAuthorship]);

    expect(diagnostics(result.report, routerAuthorship).map(({ path }) => path)).toContain(path);
  });

  it("keeps module middleware independent of its configured module", async () => {
    const path = "services/orders/src/service/modules/catalog/middleware/access.ts";
    const root = await createFixture(
      {
        [path]: `
          import { impl } from "#orders-service/impl";
          import { module } from "../module.js";
          /** Admits Catalog access. */
          export const middleware = impl.catalog.middleware(({ next }) => next());
        `,
      },
      [contextBoundaries]
    );
    const result = await check(root, [contextBoundaries]);

    expect(diagnostics(result.report, contextBoundaries).map(({ path }) => path)).toContain(path);
  });

  it("admits canonical downward module collaboration", async () => {
    const rules = [
      contractAuthority,
      contractPropertyDescriptions,
      routerAuthorship,
      contextBoundaries,
      moduleIsolation,
    ];
    const root = await createFixture(
      {
        "services/orders/src/service/modules/catalog/contract/get.ts": `
          import { oc } from "@orpc/contract";
          import { Type } from "typebox";
          import { standard } from "#adapters/typebox";
          import { OrderIdSchema } from "#orders-service/modules/catalog/model/dto/order";
          export const get = oc.input(standard(Type.Object({
            id: OrderIdSchema,
          })));
        `,
        "services/orders/src/service/modules/catalog/contract/index.ts": `
          import { get } from "./get";
          export const contract = { get };
        `,
        "services/orders/src/service/modules/catalog/middleware/access.ts": `
          import { impl } from "#orders-service/impl";
          /** Admits Catalog access. */
          export const middleware = impl.catalog.middleware(({ next }) => next());
        `,
        "services/orders/src/service/modules/catalog/router/get.ts": `
          import { module } from "../module";
          export const get = module.get.handler(getOrder);
        `,
        "services/orders/src/service/modules/catalog/router/index.ts": `
          import { get } from "./get";
          export const router = { get };
        `,
      },
      rules
    );
    const result = await check(root, rules);

    for (const rule of rules) {
      expect(diagnostics(result.report, rule)).toEqual([]);
    }
  });

  it("rejects leaves that cycle through their own access point", async () => {
    const contractPaths = [
      "services/orders/src/service/modules/catalog/contract/get.ts",
      "services/orders/src/service/modules/catalog/contract/list.ts",
      "services/orders/src/service/modules/catalog/contract/by-id.ts",
    ];
    const middlewarePaths = [
      "services/orders/src/service/modules/catalog/middleware/access.ts",
      "services/orders/src/service/modules/catalog/middleware/read.ts",
      "services/orders/src/service/modules/catalog/middleware/write.ts",
      "services/orders/src/service/modules/catalog/middleware/module-bridge.ts",
      "services/orders/src/service/modules/catalog/middleware/index-bridge.ts",
    ];
    const routerPaths = [
      "services/orders/src/service/modules/catalog/router/get.ts",
      "services/orders/src/service/modules/catalog/router/list.ts",
      "services/orders/src/service/modules/catalog/router/by-id.ts",
    ];
    const rules = [contractAuthority, routerAuthorship, contextBoundaries];
    const root = await createFixture(
      {
        [contractPaths[0]]: `
          import { oc } from "@orpc/contract";
          import { standard } from "#adapters/typebox";
          import { contract } from "./";
          export const get = oc.input(standard(OrderRequestSchema));
        `,
        [contractPaths[1]]: `
          import { oc } from "@orpc/contract";
          import { standard } from "#adapters/typebox";
          import { contract } from "../contract/";
          export const list = oc.input(standard(OrderRequestSchema));
        `,
        [contractPaths[2]]: `
          import { oc } from "@orpc/contract";
          import { standard } from "#adapters/typebox";
          import { contract } from "#orders-service/modules/catalog/contract";
          export const byId = oc.input(standard(OrderRequestSchema));
        `,
        [middlewarePaths[0]]: `
          import { impl } from "#orders-service/impl";
          import { admitCatalog } from "./";
          /** Admits Catalog access. */
          export const middleware = impl.catalog.middleware(({ next }) => next());
        `,
        [middlewarePaths[1]]: `
          import { impl } from "#orders-service/impl";
          import { admitCatalog } from "../middleware/";
          /** Admits read-only Catalog access. */
          export const middleware = impl.catalog.middleware(({ next }) => next());
        `,
        [middlewarePaths[2]]: `
          import { impl } from "#orders-service/impl";
          import { admitCatalog } from "#orders-service/modules/catalog/middleware";
          /** Admits Catalog writes. */
          export const middleware = impl.catalog.middleware(({ next }) => next());
        `,
        [middlewarePaths[3]]: `
          import { impl } from "#orders-service/impl";
          /** Admits Catalog module-bridge probes. */
          export const middleware = impl.catalog.middleware(({ next }) => next());
          export { module } from "../module";
        `,
        [middlewarePaths[4]]: `
          import { impl } from "#orders-service/impl";
          /** Admits Catalog index-bridge probes. */
          export const middleware = impl.catalog.middleware(({ next }) => next());
          export { admitCatalog } from "./";
        `,
        [routerPaths[0]]: `
          import { router } from "./";
          import { module } from "../module";
          export const get = module.get.handler(getOrder);
        `,
        [routerPaths[1]]: `
          import { router } from "../router/";
          import { module } from "../module";
          export const list = module.list.handler(listOrders);
        `,
        [routerPaths[2]]: `
          import { router } from "#orders-service/modules/catalog/router";
          import { module } from "../module";
          export const byId = module.byId.handler(getOrder);
        `,
      },
      rules
    );
    const result = await check(root, rules);

    const contractDiagnostics = diagnostics(result.report, contractAuthority).map(
      ({ path }) => path
    );
    const middlewareDiagnostics = diagnostics(result.report, contextBoundaries).map(
      ({ path }) => path
    );
    const routerDiagnostics = diagnostics(result.report, routerAuthorship).map(({ path }) => path);

    for (const path of contractPaths) {
      expect(contractDiagnostics).toContain(path);
    }
    for (const path of middlewarePaths) {
      expect(middlewareDiagnostics).toContain(path);
    }
    for (const path of routerPaths) {
      expect(routerDiagnostics).toContain(path);
    }
  });
});
