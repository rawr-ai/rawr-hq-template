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
  const git = Bun.spawnSync(["git", "init", "--quiet"], { cwd: root });
  if (git.exitCode !== 0) {
    throw new Error(`Unable to initialize Habitat fixture Git repository: ${git.stderr}`);
  }
  const add = Bun.spawnSync(["git", "add", "."], { cwd: root });
  if (add.exitCode !== 0) {
    throw new Error(`Unable to stage Habitat fixture paths: ${add.stderr}`);
  }
  const commit = Bun.spawnSync(
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
    { cwd: root }
  );
  if (commit.exitCode !== 0) {
    throw new Error(`Unable to commit Habitat fixture paths: ${commit.stderr}`);
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

/** @param {Record<string, string>} moduleFiles */
function standaloneService(moduleFiles) {
  return {
    "services/orders/package.json": "{}",
    "services/orders/project.json": "{}",
    "services/orders/tsconfig.json": "{}",
    "services/orders/src/client.ts": "export {};",
    "services/orders/src/service/base.ts": "export const base = {};",
    "services/orders/src/service/contract.ts": "export const contract = {};",
    "services/orders/src/service/impl.ts": "export const service = {};",
    "services/orders/src/service/router.ts": "export const router = {};",
    ...moduleFiles,
  };
}

/** @param {Record<string, string>} [moduleFiles] */
function apiService(moduleFiles = {}) {
  return {
    "plugins/server/api/catalog/src/service/base.ts": "export type Context = {};",
    "plugins/server/api/catalog/src/service/contract.ts": "export const contract = {};",
    "plugins/server/api/catalog/src/service/impl.ts": "export const service = {};",
    "plugins/server/api/catalog/src/service/router.ts": "export const router = {};",
    "plugins/server/api/catalog/src/service/modules/search/contract.ts":
      "export const contract = {};",
    "plugins/server/api/catalog/src/service/modules/search/AGENTS.md": "# Search",
    "plugins/server/api/catalog/src/service/modules/search/module.ts": "export const module = {};",
    "plugins/server/api/catalog/src/service/modules/search/router.ts":
      'import { find } from "./router/find.router"; export const router = { find };',
    "plugins/server/api/catalog/src/service/modules/search/router/find.router.ts":
      "export const find = {};",
    ...moduleFiles,
  };
}

/** @param {HabitatReport} report @param {string} ruleId */
function diagnostics(report, ruleId) {
  return report.rules.find((rule) => rule.ruleId === ruleId)?.diagnostics ?? [];
}

describe("service blueprint authority", () => {
  it("admits the canonical service topology without a database", async () => {
    const rules = ["require_service_spine_topology", "require_service_database_topology"];
    const root = await createFixture(
      standaloneService({
        "services/orders/src/service/modules/catalog/AGENTS.md": "# Catalog",
        "services/orders/src/service/modules/catalog/contract.ts": "export const contract = {};",
        "services/orders/src/service/modules/catalog/module.ts": "export const module = {};",
        "services/orders/src/service/modules/catalog/router.ts":
          'import { find } from "./router/find.router"; export const router = { find };',
        "services/orders/src/service/modules/catalog/router/find.router.ts":
          "export const find = {};",
        "services/orders/src/service/modules/catalog/model/dto/order.ts": "export type Order = {};",
        "services/orders/src/service/modules/grouped/AGENTS.md": "# Grouped",
        "services/orders/src/service/modules/grouped/contract.ts": "export const contract = {};",
        "services/orders/src/service/modules/grouped/module.ts": "export const module = {};",
        "services/orders/src/service/modules/grouped/router.ts":
          'import { read } from "./router/read.router"; import { write } from "./router/write.router"; export const router = { read, write };',
        "services/orders/src/service/modules/grouped/router/read.router.ts":
          "export const read = {};",
        "services/orders/src/service/modules/grouped/router/write.router.ts":
          "export const write = {};",
        "services/orders/src/service/modules/audit-v2/AGENTS.md": "# Audit",
        "services/orders/src/service/modules/audit-v2/contract.ts": "export const contract = {};",
        "services/orders/src/service/modules/audit-v2/module.ts": "export const module = {};",
        "services/orders/src/service/modules/audit-v2/router.ts":
          'import { inspect } from "./router/inspect.router"; export const router = { inspect };',
        "services/orders/src/service/modules/audit-v2/router/inspect.router.ts":
          "export const inspect = {};",
        ...apiService(),
      }),
      rules,
      { require_service_database_topology: "database" }
    );

    const result = await check(root, rules);
    expect(result.report.rules.flatMap((rule) => rule.diagnostics)).toEqual([]);
    expect(result.exitCode).toBe(0);
    expect(result.report.ok).toBe(true);
  });

  it("rejects API module db, model index, invalid names, and noncanonical routers", async () => {
    const rules = ["require_service_spine_topology"];
    const root = await createFixture(
      {
        ...standaloneService({
          "services/orders/src/service/modules/database/AGENTS.md": "# Database",
          "services/orders/src/service/modules/database/contract.ts": "export const contract = {};",
          "services/orders/src/service/modules/database/module.ts": "export const module = {};",
          "services/orders/src/service/modules/database/router.ts":
            'import { find } from "./router/find.router"; export const router = { find };',
          "services/orders/src/service/modules/database/router/find.router.ts":
            "export const find = {};",
          "services/orders/src/service/modules/database/db/store.ts": "export const store = {};",
          "services/orders/src/service/modules/indexed-router/contract.ts":
            "export const contract = {};",
          "services/orders/src/service/modules/indexed-router/AGENTS.md": "# Indexed router",
          "services/orders/src/service/modules/indexed-router/module.ts":
            "export const module = {};",
          "services/orders/src/service/modules/indexed-router/router.ts":
            'import { find } from "./router/find.router"; export const router = { find };',
          "services/orders/src/service/modules/indexed-router/router/index.ts":
            'export { find } from "./find.router";',
          "services/orders/src/service/modules/indexed-router/router/find.router.ts":
            "export const find = {};",
          "services/orders/src/service/modules/indexed-router/model/dto/index.ts":
            'export type { Order } from "./order";',
          "services/orders/src/service/modules/indexed-router/model/dto/order.ts":
            "export type Order = {};",
          "services/orders/src/service/modules/missing-agents/contract.ts":
            "export const contract = {};",
          "services/orders/src/service/modules/missing-agents/module.ts":
            "export const module = {};",
          "services/orders/src/service/modules/missing-agents/router.ts":
            'import { find } from "./router/find.router"; export const router = { find };',
          "services/orders/src/service/modules/missing-agents/router/find.router.ts":
            "export const find = {};",
          "services/orders/src/service/modules/missing-router/contract.ts":
            "export const contract = {};",
          "services/orders/src/service/modules/missing-router/module.ts":
            "export const module = {};",
          "services/orders/src/service/modules/missing-router/router/find.router.ts":
            "export const find = {};",
          "services/orders/src/service/modules/missing-router-directory/contract.ts":
            "export const contract = {};",
          "services/orders/src/service/modules/missing-router-directory/module.ts":
            "export const module = {};",
          "services/orders/src/service/modules/missing-router-directory/router.ts":
            "export const router = {};",
          "services/orders/src/service/modules/1st/AGENTS.md": "# Invalid",
          "services/orders/src/service/modules/1st/contract.ts": "export const contract = {};",
          "services/orders/src/service/modules/1st/module.ts": "export const module = {};",
          "services/orders/src/service/modules/1st/router.ts":
            'import { find } from "./router/find.router"; export const router = { find };',
          "services/orders/src/service/modules/1st/router/find.router.ts":
            "export const find = {};",
          "services/orders/src/service/modules/a--b/AGENTS.md": "# Invalid",
          "services/orders/src/service/modules/a--b/contract.ts": "export const contract = {};",
          "services/orders/src/service/modules/a--b/module.ts": "export const module = {};",
          "services/orders/src/service/modules/a--b/router.ts":
            'import { find } from "./router/find.router"; export const router = { find };',
          "services/orders/src/service/modules/a--b/router/find.router.ts":
            "export const find = {};",
          "services/orders/src/service/modules/a-2/AGENTS.md": "# Invalid",
          "services/orders/src/service/modules/a-2/contract.ts": "export const contract = {};",
          "services/orders/src/service/modules/a-2/module.ts": "export const module = {};",
          "services/orders/src/service/modules/a-2/router.ts":
            'import { find } from "./router/find.router"; export const router = { find };',
          "services/orders/src/service/modules/a-2/router/find.router.ts":
            "export const find = {};",
        }),
        "plugins/server/api/catalog/src/service/base.ts": "export type Context = {};",
        "plugins/server/api/catalog/src/service/contract.ts": "export const contract = {};",
        "plugins/server/api/catalog/src/service/impl.ts": "export const service = {};",
        "plugins/server/api/catalog/src/service/router.ts": "export const router = {};",
        "plugins/server/api/catalog/src/service/modules/search/contract.ts":
          "export const contract = {};",
        "plugins/server/api/catalog/src/service/modules/search/AGENTS.md": "# Search",
        "plugins/server/api/catalog/src/service/modules/search/module.ts":
          "export const module = {};",
        "plugins/server/api/catalog/src/service/modules/search/router.ts":
          'import { find } from "./router/find.router"; export const router = { find };',
        "plugins/server/api/catalog/src/service/modules/search/router/find.router.ts":
          "export const find = {};",
        "plugins/server/api/catalog/src/service/modules/search/db/store.ts":
          "export const store = {};",
      },
      rules
    );

    const result = await check(root, rules);
    expect(result.exitCode).toBe(0);
    const structurePaths = diagnostics(result.report, "require_service_spine_topology").map(
      (diagnostic) => diagnostic.path
    );
    expect(structurePaths).toContain("services/orders/src/service/modules/database/db");
    expect(structurePaths).toContain("plugins/server/api/catalog/src/service/modules/search/db");
    expect(structurePaths).toContain(
      "services/orders/src/service/modules/indexed-router/model/dto/index.ts"
    );
    expect(structurePaths).toContain(
      "services/orders/src/service/modules/indexed-router/router/index.ts"
    );
    expect(structurePaths).toContain("services/orders/src/service/modules/missing-agents");
    expect(structurePaths).toContain("services/orders/src/service/modules/missing-router");
    expect(structurePaths).toContain(
      "services/orders/src/service/modules/missing-router-directory"
    );
    expect(structurePaths).toContain("services/orders/src/service/modules/1st");
    expect(structurePaths).toContain("services/orders/src/service/modules/a--b");
    expect(structurePaths).toContain("services/orders/src/service/modules/a-2");
  });

  it("admits a root database without separate physical schema leaves", async () => {
    const rule = "require_service_database_topology";
    const root = await createFixture(
      {
        "services/orders/src/service/db/migrations/0001_create_orders.sql":
          "create table orders (id text primary key);",
        "services/orders/src/service/db/stores/orders.store.ts":
          "export const createOrdersStore = () => ({});",
      },
      [rule],
      { [rule]: "database" }
    );

    const result = await check(root, [rule]);
    expect(diagnostics(result.report, rule)).toEqual([]);
    expect(result.exitCode).toBe(0);
    expect(result.report.ok).toBe(true);
  });

  it("admits a root database with separate physical schema leaves", async () => {
    const rule = "require_service_database_topology";
    const root = await createFixture(
      {
        "services/orders/src/service/db/migrations/0001_create_orders.sql":
          "create table orders (id text primary key);",
        "services/orders/src/service/db/schema/orders.schema.ts": "export const orders = {};",
        "services/orders/src/service/db/stores/orders.store.ts":
          "export const createOrdersStore = () => ({});",
      },
      [rule],
      { [rule]: "database" }
    );

    const result = await check(root, [rule]);
    expect(diagnostics(result.report, rule)).toEqual([]);
    expect(result.exitCode).toBe(0);
    expect(result.report.ok).toBe(true);
  });

  it("rejects databases missing migrations or stores", async () => {
    const rule = "require_service_database_topology";
    const root = await createFixture(
      {
        "services/missing-migrations/src/service/db/stores/orders.store.ts":
          "export const createOrdersStore = () => ({});",
        "services/missing-stores/src/service/db/migrations/0001_create_orders.sql":
          "create table orders (id text primary key);",
      },
      [rule],
      { [rule]: "database" }
    );

    const result = await check(root, [rule]);
    expect(result.exitCode).toBe(1);
    expect(result.report.ok).toBe(false);
    const paths = diagnostics(result.report, rule).map((diagnostic) => diagnostic.path);
    expect(paths).toContain("services/missing-migrations/src/service/db");
    expect(paths).toContain("services/missing-stores/src/service/db");
  });

  it("rejects malformed physical schema leaves and noncanonical interiors", async () => {
    const rule = "require_service_database_topology";
    const root = await createFixture(
      {
        "services/orders/src/service/db/migrations/0001_create_orders.sql":
          "create table orders (id text primary key);",
        "services/orders/src/service/db/schema/orders.schema.ts": "export const orders = {};",
        "services/orders/src/service/db/schema/order-mapping.ts": "export const orderMapping = {};",
        "services/orders/src/service/db/stores/orders.store.ts":
          "export const createOrdersStore = () => ({});",
        "services/orders/src/service/db/stores/store.helper.ts": "export const helper = {};",
        "services/orders/src/service/db/providers/postgres.provider.ts":
          "export const provider = {};",
        "services/orders/src/service/db/helpers/query.ts": "export const query = {};",
      },
      [rule],
      { [rule]: "database" }
    );

    const result = await check(root, [rule]);
    expect(result.exitCode).toBe(1);
    expect(result.report.ok).toBe(false);
    const paths = diagnostics(result.report, rule).map((diagnostic) => diagnostic.path);
    expect(paths).toContain("services/orders/src/service/db/schema/order-mapping.ts");
    expect(paths).toContain("services/orders/src/service/db/stores/store.helper.ts");
    expect(paths).toContain("services/orders/src/service/db/providers");
    expect(paths).toContain("services/orders/src/service/db/helpers");
  });

  it("rejects module and embedded API database placement by database law alone", async () => {
    const rule = "require_service_database_topology";
    const root = await createFixture(
      {
        "services/orders/src/service/modules/catalog/db/stores/orders.store.ts":
          "export const createOrdersStore = () => ({});",
        "plugins/server/api/catalog/src/service/db/schema/catalog.schema.ts":
          "export const catalog = {};",
        "plugins/server/api/catalog/src/service/modules/search/db/migrations/0001_search.sql":
          "create table search (id text primary key);",
      },
      [rule],
      { [rule]: "database" }
    );

    const result = await check(root, [rule]);
    expect(result.exitCode).toBe(1);
    expect(result.report.ok).toBe(false);
    const paths = diagnostics(result.report, rule).map((diagnostic) => diagnostic.path);
    expect(paths).toContain("services/orders/src/service/modules/catalog/db/stores");
    expect(paths).toContain("plugins/server/api/catalog/src/service/db/schema");
    expect(paths).toContain("plugins/server/api/catalog/src/service/modules/search/db/migrations");
  });

  it("funnels database source through root middleware and inherited context", async () => {
    const rule = "require_service_database_import_funnel";
    const root = await createFixture(
      {
        "services/orders/src/service/middleware/orders.middleware.ts": `
          import { createOrdersStore } from "../db/stores/orders.store";
          const quotedImport = import("../db/stores/orders.store");
          const templateImport = import(\`../db/stores/orders.store\`);
          const quotedRequire = require("../db/stores/orders.store");
          const templateRequire = require(\`../db/stores/orders.store\`);
          const quotedResolve = require.resolve("../db/stores/orders.store");
          const templateResolve = require.resolve(\`../db/stores/orders.store\`);
          export const ordersMiddleware = {
            createOrdersStore,
            quotedImport,
            templateImport,
            quotedRequire,
            templateRequire,
            quotedResolve,
            templateResolve,
          };
        `,
        "services/orders/src/service/db/stores/orders.store.ts": `
          import { orders } from "#orders-service/db/schema/orders.schema";
          const quotedImport = import("#orders-service/db/schema/orders.schema");
          const templateImport = import(\`#orders-service/db/schema/orders.schema\`);
          const quotedRequire = require("#orders-service/db/schema/orders.schema");
          const templateRequire = require(\`#orders-service/db/schema/orders.schema\`);
          const quotedResolve = require.resolve("#orders-service/db/schema/orders.schema");
          const templateResolve = require.resolve(\`#orders-service/db/schema/orders.schema\`);
          export const createOrdersStore = () => ({
            orders,
            quotedImport,
            templateImport,
            quotedRequire,
            templateRequire,
            quotedResolve,
            templateResolve,
          });
        `,
        "services/orders/src/service/base.ts": `
          import type { OrdersStore } from "#orders-service/db/stores/orders.store";
          const quotedImport = import("./db/stores/orders.store");
          const templateImport = import(\`./db/stores/orders.store\`);
          const quotedRequire = require("./db/stores/orders.store");
          const templateRequire = require(\`./db/stores/orders.store\`);
          const quotedResolve = require.resolve("./db/stores/orders.store");
          const templateResolve = require.resolve(\`./db/stores/orders.store\`);
          export type Context = { orders: OrdersStore };
          export const loaders = {
            quotedImport,
            templateImport,
            quotedRequire,
            templateRequire,
            quotedResolve,
            templateResolve,
          };
        `,
        "services/orders/src/service/contract.ts": `
          const quotedImport = import("#orders-service/db/stores/orders.store");
          const templateImport = import(\`#orders-service/db/stores/orders.store\`);
          const quotedRequire = require("#orders-service/db/stores/orders.store");
          const templateRequire = require(\`#orders-service/db/stores/orders.store\`);
          const quotedResolve = require.resolve("#orders-service/db/stores/orders.store");
          const templateResolve = require.resolve(\`#orders-service/db/stores/orders.store\`);
          export const loaders = {
            quotedImport,
            templateImport,
            quotedRequire,
            templateRequire,
            quotedResolve,
            templateResolve,
          };
        `,
        "services/orders/src/service/router.ts": `
          export { createOrdersStore } from "./db/stores/orders.store";
        `,
        "services/orders/src/service/modules/catalog/middleware/catalog.middleware.ts": `
          import { createOrdersStore } from "#orders-service/db/stores/orders.store";
          export const catalogMiddleware = createOrdersStore;
        `,
        "services/orders/src/service/modules/catalog/router/read.router.ts": `
          import { createOrdersStore } from "../../../db/stores/orders.store";
          export const read = createOrdersStore;
        `,
        "services/orders/src/service/modules/catalog/router/path.router.ts": `
          const migrationDirectory = "../../../db/migrations";
          const owner = "orders";
          export const database = import(\`#\${owner}-service/db/stores/orders.store\`);
          export { migrationDirectory };
        `,
      },
      [rule],
      { [rule]: "database" }
    );

    const result = await check(root, [rule]);
    expect(result.exitCode).toBe(1);
    expect(result.report.ok).toBe(false);
    const findings = diagnostics(result.report, rule);
    const counts = new Map();
    for (const finding of findings) {
      counts.set(finding.path, (counts.get(finding.path) ?? 0) + 1);
    }

    for (const [path, count] of [
      ["services/orders/src/service/base.ts", 7],
      ["services/orders/src/service/contract.ts", 6],
      ["services/orders/src/service/router.ts", 1],
      ["services/orders/src/service/modules/catalog/middleware/catalog.middleware.ts", 1],
      ["services/orders/src/service/modules/catalog/router/read.router.ts", 1],
      ["services/orders/src/service/middleware/orders.middleware.ts", 0],
      ["services/orders/src/service/db/stores/orders.store.ts", 0],
      ["services/orders/src/service/modules/catalog/router/path.router.ts", 0],
    ]) {
      expect(counts.get(path) ?? 0).toBe(count);
    }
    expect(findings).toHaveLength(16);
  });

  it("requires direct role anchors without imposing a runtime API base", async () => {
    const rule = "require_service_anchor_exports";
    const root = await createFixture(
      {
        "services/missing/src/service/base.ts":
          "export const runtime = implementEffect(contract, layer);",
        "services/missing/src/service/contract.ts": "export const jobsContract = {};",
        "services/missing/src/service/impl.ts": "export const configured = runtime.use(provider);",
        "services/missing/src/service/router.ts": "export const jobsRouter = {};",
        "services/missing/src/service/modules/catalog/contract.ts":
          "export const catalogContract = {};",
        "services/missing/src/service/modules/catalog/module.ts":
          "export const catalog = service.catalog;",
        "services/missing/src/service/modules/catalog/router.ts":
          "export const catalogRouter = {};",
        "services/invalid-factory/src/service/base.ts": `
          import { os } from "@orpc/server";
          export const base = implementEffect(contract, layer).$context<InitialContext>();
          const middleware = os.$context<InitialContext>();
          export function createMiddleware() {
            return base;
          }
        `,
        "services/aliased-author/src/service/base.ts": `
          import { os, os as native } from "@orpc/server";
          export const base = implementEffect(contract, layer).$context<InitialContext>();
          const middleware = os.$context<InitialContext>();
          const other = native.$context<InitialContext>();
          export function createMiddleware() {
            return middleware;
          }
          export function createOtherMiddleware() {
            return other;
          }
        `,
        "services/local-aliased-author/src/service/base.ts": `
          import { os } from "@orpc/server";
          export const base = implementEffect(contract, layer).$context<InitialContext>();
          const middleware = os.$context<InitialContext>();
          const native = os;
          const other = native.$context<InitialContext>();
          export function createMiddleware() {
            return middleware;
          }
          export function createOtherMiddleware() {
            return other;
          }
        `,
        "services/untyped-author/src/service/base.ts": `
          import { os } from "@orpc/server";
          export const base = implementEffect(contract, layer).$context<InitialContext>();
          const middleware = os.$context<InitialContext>();
          const other = os.$context();
          export function createMiddleware() {
            return middleware;
          }
          export function createOtherMiddleware() {
            return other;
          }
        `,
        "services/valid/src/service/base.ts":
          "export const base = implementEffect(contract, layer);",
        "services/valid-factory/src/service/base.ts": `
          import { os } from "@orpc/server";
          export const base = implementEffect(contract, layer).$context<InitialContext>();
          const middleware = os.$context<InitialContext>();
          export function createMiddleware() {
            return middleware;
          }
        `,
        "services/valid/src/service/contract.ts": "export const contract = {};",
        "services/valid/src/service/impl.ts": "export const service = base.use(provider);",
        "services/valid/src/service/router.ts": "export const router = {};",
        "services/valid/src/service/modules/catalog/contract.ts": "export const contract = {};",
        "services/valid/src/service/modules/catalog/module.ts":
          "export const module = service.catalog;",
        "services/valid/src/service/modules/catalog/router.ts":
          'import { find } from "./router/find.router"; export const router = { find };',
        "services/valid/src/service/modules/catalog/router/find.router.ts":
          "export const find = module.find.effect(handler);",
        "plugins/server/api/catalog/src/service/base.ts":
          "export type Context = { readonly request: Request };",
      },
      [rule]
    );

    const result = await check(root, [rule]);
    expect(result.exitCode).toBe(0);
    const paths = diagnostics(result.report, rule).map((diagnostic) => diagnostic.path);
    for (const path of [
      "services/missing/src/service/base.ts",
      "services/missing/src/service/contract.ts",
      "services/missing/src/service/impl.ts",
      "services/missing/src/service/router.ts",
      "services/missing/src/service/modules/catalog/contract.ts",
      "services/missing/src/service/modules/catalog/module.ts",
      "services/missing/src/service/modules/catalog/router.ts",
      "services/invalid-factory/src/service/base.ts",
      "services/aliased-author/src/service/base.ts",
      "services/local-aliased-author/src/service/base.ts",
      "services/untyped-author/src/service/base.ts",
    ]) {
      expect(paths).toContain(path);
    }
    for (const path of [
      "services/valid/src/service/base.ts",
      "services/valid-factory/src/service/base.ts",
      "services/valid/src/service/contract.ts",
      "services/valid/src/service/impl.ts",
      "services/valid/src/service/router.ts",
      "services/valid/src/service/modules/catalog/contract.ts",
      "services/valid/src/service/modules/catalog/module.ts",
      "services/valid/src/service/modules/catalog/router.ts",
      "services/valid/src/service/modules/catalog/router/find.router.ts",
      "plugins/server/api/catalog/src/service/base.ts",
    ]) {
      expect(paths).not.toContain(path);
    }
  });

  it("admits one embedded API context author and rejects alternate middleware roots", async () => {
    const anchor = "require_service_anchor_exports";
    const context = "require_service_context_boundaries";
    const root = await createFixture(
      {
        "services/reference/src/service/base.ts": `
          export const base = implementEffect(contract, layer);
        `,
        "plugins/server/api/valid/src/service/base.ts": `
          import { os } from "@orpc/server";
          export type Context = { readonly repoRoot: string };
          const middleware = os.$context<Context>();
          export function createMiddleware() {
            return middleware;
          }
        `,
        "plugins/server/api/valid/src/service/middleware/client.middleware.ts": `
          import { createMiddleware } from "../base";
          /** Resolves the host-owned domain client for one API request. */
          export const client = createMiddleware().middleware(handler);
        `,
        "plugins/server/api/type-only/src/service/base.ts": `
          export type Context = { readonly repoRoot: string };
        `,
        "plugins/server/api/missing-factory/src/service/base.ts": `
          import { os } from "@orpc/server";
          type Context = { readonly repoRoot: string };
          const middleware = os.$context<Context>();
        `,
        "plugins/server/api/aliased-author/src/service/base.ts": `
          import { os as native } from "@orpc/server";
          type Context = { readonly repoRoot: string };
          const middleware = native.$context<Context>();
          export function createMiddleware() {
            return middleware;
          }
        `,
        "plugins/server/api/untyped-author/src/service/base.ts": `
          import { os } from "@orpc/server";
          type Context = { readonly repoRoot: string };
          const middleware = os.$context<Context>();
          const other = os.$context();
          export function createMiddleware() {
            return middleware;
          }
        `,
        "plugins/server/api/fresh-author/src/service/base.ts": `
          import { os } from "@orpc/server";
          type Context = { readonly repoRoot: string };
          export function createMiddleware() {
            return os.$context<Context>();
          }
        `,
        "plugins/server/api/disconnected-author/src/service/base.ts": `
          import { os } from "@orpc/server";
          type Context = { readonly repoRoot: string };
          const middleware = os.$context<Context>();
          export function createMiddleware() {
            return service;
          }
        `,
        "plugins/server/api/duplicate-author/src/service/base.ts": `
          import { os } from "@orpc/server";
          type Context = { readonly repoRoot: string };
          const middleware = os.$context<Context>();
          const other = os.$context<Context>();
          export function createMiddleware() {
            return middleware;
          }
        `,
        "plugins/server/api/public-author/src/service/base.ts": `
          import { os } from "@orpc/server";
          type Context = { readonly repoRoot: string };
          export const middleware = os.$context<Context>();
          export function createMiddleware() {
            return middleware;
          }
        `,
        "plugins/server/api/exported-author/src/service/base.ts": `
          import { os } from "@orpc/server";
          type Context = { readonly repoRoot: string };
          const middleware = os.$context<Context>();
          export { middleware };
          export function createMiddleware() {
            return middleware;
          }
        `,
        "plugins/server/api/default-author/src/service/base.ts": `
          import { os } from "@orpc/server";
          type Context = { readonly repoRoot: string };
          const middleware = os.$context<Context>();
          export default middleware;
          export function createMiddleware() {
            return middleware;
          }
        `,
        "plugins/server/api/aliased-export-author/src/service/base.ts": `
          import { os } from "@orpc/server";
          type Context = { readonly repoRoot: string };
          const middleware = os.$context<Context>();
          export const publicAuthor = middleware;
          export function createMiddleware() {
            return middleware;
          }
        `,
        "plugins/server/api/direct-base-middleware/src/service/base.ts": `
          import { os } from "@orpc/server";
          type Context = { readonly repoRoot: string };
          const middleware = os.$context<Context>();
          export function createMiddleware() {
            return middleware;
          }
          export const rogue = os.middleware(handler);
        `,
        "plugins/server/api/outside-base/src/service/impl.ts": `
          import { os } from "@orpc/server";
          export const service = os.$context<Context>();
        `,
        "plugins/server/api/direct-middleware/src/service/middleware/client.middleware.ts": `
          import { os } from "@orpc/server";
          /** Bypasses the API service's context author. */
          export const client = os.middleware(handler);
        `,
        "plugins/server/api/provider-author/src/service/base.ts": `
          export type Service = { ExecutionContext: {} };
          export const createServiceProvider =
            service.createProvider<Service["ExecutionContext"]>;
        `,
        "plugins/server/api/provider-middleware/src/service/middleware/client.middleware.ts": `
          import { createServiceProvider } from "../base";
          type ProvidedClient = { readonly client: Client };
          /** Attempts to make the embedded API a provider owner. */
          export const client =
            createServiceProvider().middleware<ProvidedClient>(handler);
        `,
      },
      [anchor, context]
    );

    const result = await check(root, [anchor, context]);
    expect(result.exitCode).toBe(0);
    const anchorPaths = diagnostics(result.report, anchor).map((diagnostic) => diagnostic.path);
    for (const path of [
      "plugins/server/api/missing-factory/src/service/base.ts",
      "plugins/server/api/aliased-author/src/service/base.ts",
      "plugins/server/api/untyped-author/src/service/base.ts",
      "plugins/server/api/fresh-author/src/service/base.ts",
      "plugins/server/api/disconnected-author/src/service/base.ts",
      "plugins/server/api/duplicate-author/src/service/base.ts",
      "plugins/server/api/public-author/src/service/base.ts",
      "plugins/server/api/exported-author/src/service/base.ts",
      "plugins/server/api/default-author/src/service/base.ts",
      "plugins/server/api/aliased-export-author/src/service/base.ts",
      "plugins/server/api/direct-base-middleware/src/service/base.ts",
    ]) {
      expect(anchorPaths).toContain(path);
    }
    for (const path of [
      "services/reference/src/service/base.ts",
      "plugins/server/api/valid/src/service/base.ts",
      "plugins/server/api/type-only/src/service/base.ts",
    ]) {
      expect(anchorPaths).not.toContain(path);
    }

    const contextPaths = diagnostics(result.report, context).map((diagnostic) => diagnostic.path);
    for (const path of [
      "plugins/server/api/outside-base/src/service/impl.ts",
      "plugins/server/api/direct-middleware/src/service/middleware/client.middleware.ts",
      "plugins/server/api/provider-author/src/service/base.ts",
      "plugins/server/api/provider-middleware/src/service/middleware/client.middleware.ts",
    ]) {
      expect(contextPaths).toContain(path);
    }
    for (const path of [
      "plugins/server/api/valid/src/service/base.ts",
      "plugins/server/api/valid/src/service/middleware/client.middleware.ts",
      "plugins/server/api/type-only/src/service/base.ts",
    ]) {
      expect(contextPaths).not.toContain(path);
    }
  });

  it("keeps operation authorship in named routers and module router composition plain", async () => {
    const rule = "require_service_router_authorship";
    const root = await createFixture(
      {
        "services/inline/src/service/modules/catalog/router.ts": `
          import { module } from "./module";
          export const router = {
            find: module.find.effect(({ context }) => context.catalog.find()),
          };
        `,
        "services/import/src/service/modules/catalog/router.ts": `
          import { policy } from "./model/policy/catalog";
          import { find } from "./router/find.router";
          export const router = { find, policy };
        `,
        "services/default/src/service/modules/catalog/router.ts": `
          import find from "./router/find.router";
          export const router = { find };
        `,
        "services/namespace/src/service/modules/catalog/router.ts": `
          import * as leaves from "./router/find.router";
          export const router = { ...leaves };
        `,
        "services/side-effect/src/service/modules/catalog/router.ts": `
          import "./router/find.router";
          export const router = {};
        `,
        "services/alias/src/service/modules/catalog/router.ts": `
          import { find } from "./router/find.router";
          export const router = { lookup: find };
        `,
        "services/arrow/src/service/modules/catalog/router.ts": `
          import { find } from "./router/find.router";
          export const router = { find: () => find };
        `,
        "services/detached/src/service/modules/catalog/router/sync.router.ts": `
          import { module } from "../module";
          export const sync = module.sync.effect(({ context, input }) =>
            runSync(input, context)
          );
          export async function runSync(request, dependencies) {
            return dependencies.sync(request);
          }
        `,
        "services/detached-arrow/src/service/modules/catalog/router/sync.router.ts": `
          import { module } from "../module";
          const runSync = async (request, dependencies) => dependencies.sync(request);
          export const sync = module.sync.effect(({ context, input }) =>
            runSync(input, context)
          );
        `,
        "services/detached-expression/src/service/modules/catalog/router/sync.router.ts": `
          import { module } from "../module";
          const runSync = async function (request, dependencies) {
            return dependencies.sync(request);
          };
          export const sync = module.sync.effect(({ context, input }) =>
            runSync(input, context)
          );
        `,
        "services/detached-satisfies/src/service/modules/catalog/router/sync.router.ts": `
          import { module } from "../module";
          const runSync = (async (request, dependencies) =>
            dependencies.sync(request)) satisfies SyncHandler;
          export const sync = module.sync.effect(({ context, input }) =>
            runSync(input, context)
          );
        `,
        "services/group/src/service/modules/catalog/router/read.router.ts": `
          import { module } from "../module";
          export const reads = {
            find: module.find.effect(({ context }) => context.catalog.find()),
            list: module.list.effect(({ context }) => context.catalog.list()),
          };
        `,
        "services/shorthand-group/src/service/modules/catalog/router/read.router.ts": `
          import { module } from "../module";
          const find = module.find.effect(({ context }) => context.catalog.find());
          const list = module.list.effect(({ context }) => context.catalog.list());
          export const reads = { find, list };
        `,
        "services/nested-group/src/service/modules/catalog/router/read.router.ts": `
          import { module } from "../module";
          const reads = {
            find: module.find.effect(({ context }) => context.catalog.find()),
            list: module.list.effect(({ context }) => context.catalog.list()),
          };
          export const router = { ...reads };
        `,
        "services/shorthand-nested-group/src/service/modules/catalog/router/read.router.ts": `
          import { module } from "../module";
          const reads = {
            find: module.find.effect(({ context }) => context.catalog.find()),
            list: module.list.effect(({ context }) => context.catalog.list()),
          };
          export const router = { reads };
        `,
        "services/aliased-nested-group/src/service/modules/catalog/router/read.router.ts": `
          import { module } from "../module";
          const catalogReads = {
            find: module.find.effect(({ context }) => context.catalog.find()),
            list: module.list.effect(({ context }) => context.catalog.list()),
          };
          export const router = { reads: catalogReads };
        `,
        "services/valid/src/service/modules/catalog/router.ts": `
          import { find } from "./router/find.router";
          import { reads } from "./router/read.router";
          import type { Router } from "./contract";
          export const router = { find, ...reads } satisfies Router;
        `,
        "services/valid/src/service/modules/catalog/router/find.router.ts": `
          import { module } from "../module";
          export const find = module.find.effect(({ context }) => {
            function selectCatalog() {
              return context.catalog;
            }
            return selectCatalog().find();
          });
        `,
        "services/valid/src/service/modules/catalog/router/read.router.ts": `
          import { module } from "../module";
          /**
           * @purpose Own catalog lookup operations.
           * @capability Share the narrowed catalog reader.
           * @behavior Return catalog observations without mutation.
           * @relation Keep reads separate from catalog writes.
           */
          export const reads = {
            find: module.find.effect(({ context }) => context.catalog.find()),
            list: module.list.effect(({ context }) => context.catalog.list()),
          };
        `,
        "services/valid/src/service/modules/catalog/router/shorthand.router.ts": `
          import { module } from "../module";
          const find = module.find.effect(({ context }) => context.catalog.find());
          const list = module.list.effect(({ context }) => context.catalog.list());
          /**
           * @purpose Own catalog lookup operations.
           * @capability Share the narrowed catalog reader.
           * @behavior Return catalog observations without mutation.
           * @relation Keep reads separate from catalog writes.
           */
          export const shorthandReads = { find, list };
        `,
        "services/valid/src/service/modules/catalog/router/grouped.router.ts": `
          import { module } from "../module";
          /**
           * @purpose Own catalog lookup operations.
           * @capability Share the narrowed catalog reader.
           * @behavior Return catalog observations without mutation.
           * @relation Keep reads separate from catalog writes.
           */
          const reads = {
            find: module.find.effect(({ context }) => context.catalog.find()),
            list: module.list.effect(({ context }) => context.catalog.list()),
          };
          export const router = { ...reads };
        `,
        "services/valid/src/service/modules/catalog/router/grouped-shorthand.router.ts": `
          import { module } from "../module";
          /**
           * @purpose Own catalog lookup operations.
           * @capability Share the narrowed catalog reader.
           * @behavior Return catalog observations without mutation.
           * @relation Keep reads separate from catalog writes.
           */
          const reads = {
            find: module.find.effect(({ context }) => context.catalog.find()),
            list: module.list.effect(({ context }) => context.catalog.list()),
          };
          export const router = { reads };
        `,
      },
      [rule]
    );

    const result = await check(root, [rule]);
    expect(result.exitCode).toBe(0);
    const paths = diagnostics(result.report, rule).map((diagnostic) => diagnostic.path);
    for (const path of [
      "services/inline/src/service/modules/catalog/router.ts",
      "services/default/src/service/modules/catalog/router.ts",
      "services/namespace/src/service/modules/catalog/router.ts",
      "services/side-effect/src/service/modules/catalog/router.ts",
      "services/alias/src/service/modules/catalog/router.ts",
      "services/arrow/src/service/modules/catalog/router.ts",
      "services/detached/src/service/modules/catalog/router/sync.router.ts",
      "services/detached-arrow/src/service/modules/catalog/router/sync.router.ts",
      "services/detached-expression/src/service/modules/catalog/router/sync.router.ts",
      "services/detached-satisfies/src/service/modules/catalog/router/sync.router.ts",
      "services/nested-group/src/service/modules/catalog/router/read.router.ts",
      "services/shorthand-nested-group/src/service/modules/catalog/router/read.router.ts",
      "services/aliased-nested-group/src/service/modules/catalog/router/read.router.ts",
    ]) {
      expect(paths).toContain(path);
    }
    for (const path of [
      "services/valid/src/service/modules/catalog/router.ts",
      "services/valid/src/service/modules/catalog/router/find.router.ts",
      "services/valid/src/service/modules/catalog/router/read.router.ts",
      "services/valid/src/service/modules/catalog/router/shorthand.router.ts",
      "services/valid/src/service/modules/catalog/router/grouped.router.ts",
      "services/valid/src/service/modules/catalog/router/grouped-shorthand.router.ts",
      "services/group/src/service/modules/catalog/router/read.router.ts",
      "services/shorthand-group/src/service/modules/catalog/router/read.router.ts",
    ]) {
      expect(paths).not.toContain(path);
    }
  });

  it("closes root contract and router composition ownership", async () => {
    const rule = "require_service_module_isolation";
    const root = await createFixture(
      {
        "services/jobs/src/service/router.ts":
          'import { router as catalog } from "./local/../../modules/catalog/router";',
        "services/jobs/src/service/model/helpers/catalog.ts":
          'import { catalog } from "../../modules/catalog/model/policy/catalog";',
        "services/default-root/src/service/contract.ts":
          'import extra, { contract as catalog } from "./modules/catalog/contract";',
        "services/default-root/src/service/router.ts":
          'import extra, { router as catalog } from "./modules/catalog/router";',
        "services/valid-root/src/service/contract.ts":
          'import { contract as catalog, type CatalogContract } from "./modules/catalog/contract";',
        "services/valid-root/src/service/router.ts":
          'import { router as catalog, type CatalogRouter } from "./modules/catalog/router";',
        "services/mismatched-root/src/service/contract.ts":
          'import { contract as billing } from "./modules/catalog/contract";',
        "services/mismatched-root/src/service/router.ts":
          'import { router as billing } from "./modules/catalog/router";',
        "services/valid-kebab-root/src/service/contract.ts":
          'import { contract as orderItems } from "./modules/order-items/contract";',
        "services/valid-kebab-root/src/service/router.ts":
          'import { router as orderItems } from "./modules/order-items/router";',
        "services/alias-root/src/service/contract.ts":
          'import { contract as catalog } from "#alias-root-service/modules/catalog/contract";',
        "services/alias-root/src/service/router.ts":
          'import { router as catalog } from "#alias-root-service/modules/catalog/router";',
      },
      [rule]
    );

    const result = await check(root, [rule]);
    expect(result.exitCode).toBe(0);
    const paths = diagnostics(result.report, rule).map((diagnostic) => diagnostic.path);
    for (const path of [
      "services/jobs/src/service/router.ts",
      "services/jobs/src/service/model/helpers/catalog.ts",
      "services/default-root/src/service/contract.ts",
      "services/default-root/src/service/router.ts",
      "services/alias-root/src/service/contract.ts",
      "services/alias-root/src/service/router.ts",
    ]) {
      expect(paths).toContain(path);
    }
    for (const path of [
      "services/valid-root/src/service/contract.ts",
      "services/valid-root/src/service/router.ts",
      "services/mismatched-root/src/service/contract.ts",
      "services/mismatched-root/src/service/router.ts",
      "services/valid-kebab-root/src/service/contract.ts",
      "services/valid-kebab-root/src/service/router.ts",
    ]) {
      expect(paths).not.toContain(path);
    }
  });

  it("closes module-relative traversal and named-router ownership", async () => {
    const rule = "require_service_module_isolation";
    const root = await createFixture(
      {
        "services/jobs/src/service/modules/catalog/module.ts":
          'import { service } from "../../impl"; export const module = service.catalog;',
        "services/jobs/src/service/modules/catalog/model/policy/parents.ts":
          'import { value } from "../../../";',
        "services/jobs/src/service/modules/catalog/model/policy/bare-parent.ts":
          'import { value } from "model/../modules";',
        "services/jobs/src/service/modules/catalog/router/escape.router.ts":
          'import { value } from "../model/../../intake";',
        "services/jobs/src/service/modules/catalog/router/trailing.router.ts":
          'import { value } from "../model/";',
        "services/jobs/src/service/modules/catalog/router/valid.router.ts":
          'import { value } from "../model/policy/value";',
        "services/jobs/src/service/modules/catalog/model/policy/valid-relative.ts":
          'import { value } from "../dto/value";',
        "services/jobs/src/service/modules/catalog/model/policy/service-model-relative.ts":
          'import { Clock } from "../../../model/ports/clock";',
        "services/jobs/src/service/modules/catalog/model/policy/service-model-alias.ts":
          'import { Clock } from "#jobs-service/model/ports/clock";',
        "services/jobs/src/service/modules/catalog/router/cycle.router.ts":
          'import { router } from "../router";',
        "services/jobs/src/service/modules/catalog/router/reexport.router.ts":
          'export { router } from "../router";',
        "services/jobs/src/service/modules/catalog/middleware/capabilities.middleware.ts":
          'import { createMiddleware } from "../../../base";',
        "plugins/server/api/catalog/src/service/modules/search/middleware/capabilities.middleware.ts":
          'import { createMiddleware } from "../../../base";',
        "services/jobs/src/service/modules/catalog/middleware/raw-base.middleware.ts":
          'import { base } from "../../../base";',
        "services/default-module/src/service/modules/catalog/module.ts":
          'import extra, { service } from "../../impl"; export const module = service.catalog;',
      },
      [rule]
    );

    const result = await check(root, [rule]);
    expect(result.exitCode).toBe(0);
    const paths = diagnostics(result.report, rule).map((diagnostic) => diagnostic.path);
    for (const path of [
      "services/jobs/src/service/modules/catalog/model/policy/parents.ts",
      "services/jobs/src/service/modules/catalog/model/policy/bare-parent.ts",
      "services/jobs/src/service/modules/catalog/router/escape.router.ts",
      "services/jobs/src/service/modules/catalog/router/trailing.router.ts",
      "services/jobs/src/service/modules/catalog/router/cycle.router.ts",
      "services/jobs/src/service/modules/catalog/router/reexport.router.ts",
      "services/jobs/src/service/modules/catalog/middleware/raw-base.middleware.ts",
      "services/default-module/src/service/modules/catalog/module.ts",
      "services/jobs/src/service/modules/catalog/model/policy/service-model-relative.ts",
    ]) {
      expect(paths).toContain(path);
    }
    expect(paths).not.toContain("services/jobs/src/service/modules/catalog/router/valid.router.ts");
    expect(paths).not.toContain(
      "services/jobs/src/service/modules/catalog/model/policy/valid-relative.ts"
    );
    expect(paths).not.toContain(
      "services/jobs/src/service/modules/catalog/model/policy/service-model-alias.ts"
    );
    expect(paths).not.toContain(
      "services/jobs/src/service/modules/catalog/middleware/capabilities.middleware.ts"
    );
    expect(paths).not.toContain(
      "plugins/server/api/catalog/src/service/modules/search/middleware/capabilities.middleware.ts"
    );
    expect(paths).not.toContain("services/jobs/src/service/modules/catalog/module.ts");
  });

  it("closes current-owner alias normalization, sibling, and root-runtime ownership", async () => {
    const rule = "require_service_module_isolation";
    const root = await createFixture(
      {
        "services/jobs/src/service/model/policy/dot.ts":
          'import { service } from "#jobs-service/./service";',
        "services/jobs/src/service/modules/catalog/model/policy/empty.ts":
          'import { value } from "#jobs-service/modules/catalog//model/policy/value";',
        "services/jobs/src/service/modules/catalog/model/policy/sibling.ts":
          'import { value } from "#jobs-service/modules/intake/model/policy/value";',
        "services/jobs/src/service/modules/catalog/model/policy/root-runtime.ts":
          'import { service } from "#jobs-service/impl";',
        "services/jobs/src/service/modules/catalog/model/policy/trailing.ts":
          'import { value } from "#jobs-service/modules/catalog/model/policy/";',
        "services/jobs/src/service/modules/catalog/model/policy/local-alias.ts":
          'import { value } from "#jobs-service/modules/catalog/model/dto/value";',
        "services/jobs/src/service/modules/catalog/model/policy/shared.ts":
          'import { value } from "#jobs-service/shared/value";',
        "plugins/server/api/catalog/src/service/modules/search/model/policy/service-model.ts":
          'import { Clock } from "#catalog-api/model/ports/clock";',
        "services/jobs/src/service/modules/catalog/module-alias.ts":
          'import { service, type ServiceContext } from "#jobs-service/impl";',
        "services/alias/src/service/modules/catalog/module.ts":
          'import { service, type ServiceContext } from "#alias-service/impl";',
      },
      [rule]
    );

    const result = await check(root, [rule]);
    expect(result.exitCode).toBe(0);
    const paths = diagnostics(result.report, rule).map((diagnostic) => diagnostic.path);
    for (const path of [
      "services/jobs/src/service/model/policy/dot.ts",
      "services/jobs/src/service/modules/catalog/model/policy/empty.ts",
      "services/jobs/src/service/modules/catalog/model/policy/sibling.ts",
      "services/jobs/src/service/modules/catalog/model/policy/root-runtime.ts",
      "services/jobs/src/service/modules/catalog/model/policy/trailing.ts",
      "services/jobs/src/service/modules/catalog/model/policy/local-alias.ts",
      "services/jobs/src/service/modules/catalog/model/policy/shared.ts",
      "services/jobs/src/service/modules/catalog/module-alias.ts",
      "services/alias/src/service/modules/catalog/module.ts",
    ]) {
      expect(paths).toContain(path);
    }
    expect(paths).not.toContain(
      "plugins/server/api/catalog/src/service/modules/search/model/policy/service-model.ts"
    );
  });

  it("keeps context ownership and middleware provenance inside the funnel", async () => {
    const rule = "require_service_context_boundaries";
    const root = await createFixture(
      {
        "services/shadow/src/service/modules/catalog/module.ts": `
          import { service } from "../../impl";
          import { capabilities } from "./middleware/catalog.middleware";
          type Context = { readonly catalog: CatalogReader };
          export const module = service.catalog.use<Context>(capabilities);
        `,
        "services/alternate/src/service/modules/catalog/middleware/catalog.middleware.ts": `
          import { base } from "../../../base";
          /** Contributes Catalog's reader. */
          export const capabilities = base.catalog.middleware(projectCatalog);
        `,
        "services/undocumented/src/service/modules/catalog/middleware/catalog.middleware.ts": `
          import { createMiddleware } from "../../../base";
          export const capabilities = createMiddleware().middleware(projectCatalog);
        `,
        "services/default/src/service/modules/catalog/middleware/catalog.middleware.ts": `
          import { createMiddleware } from "../../../base";
          /** Contributes Catalog's reader. */
          export const capabilities = createMiddleware().middleware(projectCatalog);
          export default capabilities;
        `,
        "services/alias/src/service/modules/catalog/model/helpers/reader.ts":
          'import { createMiddleware } from "#alias-service/base";',
        "services/dependency-alias/src/service/modules/catalog/model/helpers/reader.ts":
          'import type { CatalogReader } from "#dependency-alias-service/model/dependencies/catalog";',
        "services/inline/src/service/modules/catalog/router/inline.router.ts": `
          import { module } from "../module";
          export const inline = module.find.use(async ({ next }) => next()).effect(handler);
        `,
        "services/local/src/service/modules/catalog/router/plain.router.ts": `
          import { module } from "../module";
          const requireRead = async ({ next }) => next();
          export const plain = module.find.use(requireRead).effect(handler);
        `,
        "services/helper/src/service/modules/catalog/module.ts": `
          import { service } from "../../impl";
          import { projectCatalog } from "./model/helpers/project-catalog";
          export const module = service.catalog.use(projectCatalog);
        `,
        "services/helper/src/service/modules/catalog/model/helpers/project-catalog.ts": `
          export const projectCatalog = async ({ context, next }) =>
            next({ context: { catalog: context.catalog } });
        `,
        "services/rogue-base/src/service/base.ts": `
          import { os } from "@orpc/server";
          export const base =
            implementEffect(contract, Layer.empty).$context<InitialContext>();
          const middleware = os.$context<InitialContext>();
          export function createMiddleware() {
            return middleware;
          }
          export const rogue = os.middleware(handler);
        `,
        "services/rogue-base/src/service/impl.ts": `
          import { base, rogue } from "./base";
          export const service = base.use(rogue);
        `,
        "services/valid/src/service/base.ts": `
          import { os } from "@orpc/server";
          export const base =
            implementEffect(contract, Layer.empty).$context<InitialContext>();
          const middleware = os.$context<InitialContext>();
          export function createMiddleware() {
            return middleware;
          }
        `,
        "services/valid/src/service/modules/catalog/module.ts": `
          import { service } from "../../impl";
          import { capabilities } from "./middleware/catalog.middleware";
          export const module = service.catalog
            .use(capabilities)
            .use(async ({ context, next }) =>
              next({ context: { reader: context.deps.reader } })
            );
        `,
        "services/valid/src/service/modules/catalog/middleware/catalog.middleware.ts": `
          import { createMiddleware } from "../../../base";
          /** Contributes Catalog's reader capability. */
          export const capabilities = createMiddleware().middleware(projectCatalog);
        `,
        "services/valid/src/service/middleware/observability.middleware.ts": `
          import { createRequiredServiceObservabilityMiddleware } from "../base";
          /** Adds service fields to the SDK-owned observability baseline. */
          export const observability =
            createRequiredServiceObservabilityMiddleware(options);
        `,
        "services/valid/src/service/modules/catalog/router.ts": `
          import { find } from "./router/find.router";
          export const router = { find };
        `,
        "services/valid/src/service/modules/catalog/router/find.router.ts": `
          import { module } from "../module";
          import { requireRead } from "../middleware/access.middleware";
          export const find = module.find
            .use(requireRead, ({ jobId }) => jobId)
            .effect(({ context }) => context.reader.find());
        `,
      },
      [rule]
    );

    const result = await check(root, [rule]);
    expect(result.exitCode).toBe(0);
    const paths = diagnostics(result.report, rule).map((diagnostic) => diagnostic.path);
    for (const path of [
      "services/shadow/src/service/modules/catalog/module.ts",
      "services/alternate/src/service/modules/catalog/middleware/catalog.middleware.ts",
      "services/undocumented/src/service/modules/catalog/middleware/catalog.middleware.ts",
      "services/default/src/service/modules/catalog/middleware/catalog.middleware.ts",
      "services/alias/src/service/modules/catalog/model/helpers/reader.ts",
      "services/dependency-alias/src/service/modules/catalog/model/helpers/reader.ts",
      "services/inline/src/service/modules/catalog/router/inline.router.ts",
      "services/local/src/service/modules/catalog/router/plain.router.ts",
      "services/helper/src/service/modules/catalog/module.ts",
      "services/rogue-base/src/service/impl.ts",
    ]) {
      expect(paths).toContain(path);
    }
    for (const path of [
      "services/valid/src/service/base.ts",
      "services/valid/src/service/modules/catalog/module.ts",
      "services/valid/src/service/modules/catalog/middleware/catalog.middleware.ts",
      "services/valid/src/service/middleware/observability.middleware.ts",
      "services/valid/src/service/modules/catalog/router.ts",
      "services/valid/src/service/modules/catalog/router/find.router.ts",
    ]) {
      expect(paths).not.toContain(path);
    }
  });

  it("admits terminal module curation and one base-specialized root provider", async () => {
    const rule = "require_service_context_boundaries";
    const root = await createFixture(
      {
        "services/valid/src/service/base.ts": `
          export type Service = { ExecutionContext: {} };
          export const createServiceProvider =
            service.createProvider<Service["ExecutionContext"]>;
        `,
        "services/valid/src/service/middleware/stores.middleware.ts": `
          import { createServiceProvider } from "../base";
          type ProvidedStores = { readonly tasksStore: TasksStore };
          /** Acquires the service-owned stores. */
          export const stores = createServiceProvider().middleware<ProvidedStores>(
            async ({ context, next }) => {
              const store = await makeStore(context.deps.db);
              return next({ tasksStore: store });
            }
          );
        `,
        "services/valid/src/service/modules/catalog/module.ts": `
          import { service } from "../../impl";
          import { capabilities } from "./middleware/catalog.middleware";
          export const module = service.catalog
            .use(capabilities)
            .use(async ({ context, next }) =>
              next({
                context: {
                  database: context.deps.db,
                  workspaceId: context.scope.workspace.id,
                  retryLimit: context.config.retry.limit,
                  traceId: context.invocation.traceId,
                  tasksStore: context.provided.tasksStore,
                },
              })
            );
        `,
        "services/valid/src/service/modules/catalog/middleware/catalog.middleware.ts": `
          import { createMiddleware } from "../../../base";
          /** Contributes Catalog's reader capability. */
          export const capabilities = createMiddleware().middleware(projectCatalog);
        `,
      },
      [rule]
    );

    const result = await check(root, [rule]);
    expect(result.exitCode).toBe(0);
    expect(diagnostics(result.report, rule)).toEqual([]);
  });

  it("closes standalone provider authorship and consumption to its exact owners", async () => {
    const rule = "require_service_context_boundaries";
    const root = await createFixture(
      {
        "services/duplicate-author/src/service/base.ts": `
          export type Service = { ExecutionContext: {} };
          export const createServiceProvider =
            service.createProvider<Service["ExecutionContext"]>;
          export const createOtherProvider =
            service.createProvider<Service["ExecutionContext"]>;
        `,
        "services/renamed-author/src/service/base.ts": `
          export type Service = { ExecutionContext: {} };
          export const makeProvider =
            service.createProvider<Service["ExecutionContext"]>;
        `,
        "services/indirect-author/src/service/base.ts": `
          export const createServiceProvider = getProviderAuthor();
        `,
        "services/reexported-author/src/service/base.ts": `
          export { providerAuthor as createServiceProvider } from "./provider-author";
        `,
        "services/destructured-author/src/service/base.ts": `
          const { createProvider: createServiceProvider } = service;
          export { createServiceProvider };
        `,
        "services/impl-provider/src/service/impl.ts": `
          import { createServiceProvider } from "./base";
          export const provider =
            createServiceProvider().middleware<ProvidedStores>(handler);
        `,
        "services/router-provider/src/service/router.ts": `
          import { createServiceProvider } from "./base";
          export const provider =
            createServiceProvider().middleware<ProvidedStores>(handler);
        `,
        "services/qualified-provider-call/src/service/impl.ts": `
          declare const providerFactory: {
            createServiceProvider(): unknown;
          };
          export const provider = providerFactory.createServiceProvider();
        `,
        "services/computed-provider-call/src/service/impl.ts": `
          declare const providerFactory: {
            createServiceProvider(): unknown;
          };
          export const provider = providerFactory["createServiceProvider"]();
        `,
        "services/qualified-generic-provider/src/service/impl.ts": `
          import * as providerFactory from "./base";
          export const provider =
            providerFactory.createServiceProvider<Service["ExecutionContext"]>();
        `,
        "services/computed-generic-provider/src/service/impl.ts": `
          import * as providerFactory from "./base";
          export const provider =
            providerFactory["createServiceProvider"]<Service["ExecutionContext"]>();
        `,
        "services/helper-provider/src/service/model/helpers/provider.ts": `
          import { createServiceProvider } from "../../base";
          export const provider =
            createServiceProvider().middleware<ProvidedStores>(handler);
        `,
        "services/module-provider-use/src/service/modules/catalog/module.ts": `
          import { createServiceProvider } from "../../base";
          export const provider =
            createServiceProvider().middleware<ProvidedStores>(handler);
        `,
        "services/wrong-root-depth/src/service/middleware/stores.middleware.ts": `
          import { createServiceProvider } from "../../base";
          type ProvidedStores = { readonly tasksStore: TasksStore };
          /** Acquires stores through the wrong owner edge. */
          export const stores =
            createServiceProvider().middleware<ProvidedStores>(handler);
        `,
        "services/wrong-root-middleware-depth/src/service/middleware/access.middleware.ts": `
          import { createMiddleware } from "../../../base";
          /** Contributes access through the wrong owner edge. */
          export const access = createMiddleware().middleware(handler);
        `,
        "services/wrong-module-middleware-depth/src/service/modules/catalog/middleware/access.middleware.ts": `
          import { createMiddleware } from "../base";
          /** Contributes access through the wrong owner edge. */
          export const access = createMiddleware().middleware(handler);
        `,
        "services/aliased-provider-import/src/service/middleware/stores.middleware.ts": `
          import { createServiceProvider as makeProvider } from "../base";
          type ProvidedStores = { readonly tasksStore: TasksStore };
          /** Acquires stores through a renamed author. */
          export const stores = makeProvider().middleware<ProvidedStores>(handler);
        `,
        "services/namespace-provider/src/service/middleware/stores.middleware.ts": `
          import * as base from "../base";
          type ProvidedStores = { readonly tasksStore: TasksStore };
          /** Attempts provider access through a namespace. */
          export const stores =
            base.createServiceProvider().middleware<ProvidedStores>(handler);
        `,
        "services/arbitrary-namespace-provider/src/service/middleware/stores.middleware.ts": `
          import * as providerFactory from "../base";
          type ProvidedStores = { readonly tasksStore: TasksStore };
          /** Attempts provider access through an arbitrary namespace. */
          export const stores =
            providerFactory.createServiceProvider().middleware<ProvidedStores>(handler);
        `,
        "services/computed-namespace-provider/src/service/middleware/stores.middleware.ts": `
          import * as providerFactory from "../base";
          type ProvidedStores = { readonly tasksStore: TasksStore };
          /** Attempts computed provider access through an arbitrary namespace. */
          export const stores =
            providerFactory["createServiceProvider"]().middleware<ProvidedStores>(handler);
        `,
        "services/bracket-provider-author/src/service/base.ts": `
          export type Service = { ExecutionContext: {} };
          export const makeProvider =
            service["createProvider"]<Service["ExecutionContext"]>;
        `,
        "services/destructured-provider-author/src/service/base.ts": `
          const { createProvider: makeProvider } = service;
          export const createServiceProvider = makeProvider;
        `,
        "services/shorthand-provider-author/src/service/base.ts": `
          export type Service = { ExecutionContext: {} };
          const { createProvider } = service;
          export const makeProvider =
            createProvider<Service["ExecutionContext"]>;
        `,
        "services/duplicate-provider-call/src/service/middleware/stores.middleware.ts": `
          import { createServiceProvider } from "../base";
          type ProvidedStores = { readonly tasksStore: TasksStore };
          const extra = createServiceProvider();
          /** Acquires the service-owned stores. */
          export const stores =
            createServiceProvider().middleware<ProvidedStores>(handler);
        `,
        "services/stray-provider-call/src/service/middleware/access.middleware.ts": `
          import { createMiddleware, createServiceProvider } from "../base";
          const author = createServiceProvider();
          /** Contributes access middleware, not provider middleware. */
          export const access = createMiddleware().middleware(handler);
        `,
        "services/duplicate-provider-import/src/service/middleware/stores.middleware.ts": `
          import { createServiceProvider } from "../base";
          import { createServiceProvider as otherProvider } from "../../base";
          type ProvidedStores = { readonly tasksStore: TasksStore };
          /** Acquires the service-owned stores. */
          export const stores =
            createServiceProvider().middleware<ProvidedStores>(handler);
        `,
        "plugins/server/api/catalog/src/service/base.ts": `
          export type Service = { ExecutionContext: {} };
          export const createServiceProvider =
            service.createProvider<Service["ExecutionContext"]>;
        `,
        "plugins/server/api/indirect/src/service/base.ts": `
          export const createServiceProvider = getProviderAuthor();
        `,
        "plugins/server/api/catalog/src/service/middleware/stores.middleware.ts": `
          import { createServiceProvider } from "../base";
          type ProvidedStores = { readonly tasksStore: TasksStore };
          /** Attempts to introduce unapproved API provider authority. */
          export const stores =
            createServiceProvider().middleware<ProvidedStores>(handler);
        `,
      },
      [rule]
    );

    const result = await check(root, [rule]);
    expect(result.exitCode).toBe(0);
    const paths = diagnostics(result.report, rule).map((diagnostic) => diagnostic.path);
    for (const path of [
      "services/duplicate-author/src/service/base.ts",
      "services/renamed-author/src/service/base.ts",
      "services/indirect-author/src/service/base.ts",
      "services/reexported-author/src/service/base.ts",
      "services/destructured-author/src/service/base.ts",
      "services/impl-provider/src/service/impl.ts",
      "services/router-provider/src/service/router.ts",
      "services/qualified-provider-call/src/service/impl.ts",
      "services/computed-provider-call/src/service/impl.ts",
      "services/qualified-generic-provider/src/service/impl.ts",
      "services/computed-generic-provider/src/service/impl.ts",
      "services/helper-provider/src/service/model/helpers/provider.ts",
      "services/module-provider-use/src/service/modules/catalog/module.ts",
      "services/wrong-root-depth/src/service/middleware/stores.middleware.ts",
      "services/wrong-root-middleware-depth/src/service/middleware/access.middleware.ts",
      "services/wrong-module-middleware-depth/src/service/modules/catalog/middleware/access.middleware.ts",
      "services/aliased-provider-import/src/service/middleware/stores.middleware.ts",
      "services/namespace-provider/src/service/middleware/stores.middleware.ts",
      "services/arbitrary-namespace-provider/src/service/middleware/stores.middleware.ts",
      "services/computed-namespace-provider/src/service/middleware/stores.middleware.ts",
      "services/bracket-provider-author/src/service/base.ts",
      "services/destructured-provider-author/src/service/base.ts",
      "services/shorthand-provider-author/src/service/base.ts",
      "services/duplicate-provider-call/src/service/middleware/stores.middleware.ts",
      "services/stray-provider-call/src/service/middleware/access.middleware.ts",
      "services/duplicate-provider-import/src/service/middleware/stores.middleware.ts",
      "plugins/server/api/catalog/src/service/base.ts",
      "plugins/server/api/indirect/src/service/base.ts",
      "plugins/server/api/catalog/src/service/middleware/stores.middleware.ts",
    ]) {
      expect(paths).toContain(path);
    }
  });

  it("rejects every noncanonical module curation and provider authorship class", async () => {
    const rule = "require_service_context_boundaries";
    const root = await createFixture(
      {
        "services/nonterminal/src/service/modules/catalog/module.ts": `
          import { service } from "../../impl";
          import { capabilities } from "./middleware/catalog.middleware";
          export const module = service.catalog
            .use(async ({ context, next }) =>
              next({ context: { reader: context.deps.reader } })
            )
            .use(capabilities);
        `,
        "services/missing-curation/src/service/modules/catalog/module.ts": `
          import { service } from "../../impl";
          export const module = service.catalog;
        `,
        "services/raw-lane/src/service/modules/catalog/router/read.router.ts": `
          import { module } from "../module";
          export const read = module.read.effect(({ context }) => context.deps.reader.read());
        `,
        "services/raw-lane-flat/src/service/modules/catalog/router.ts": `
          import { module } from "./module";
          export const read = module.read.effect(({ context }) => context.scope.catalogId);
        `,
        "services/destructured-raw-lane/src/service/modules/catalog/router/read.router.ts": `
          import { module } from "../module";
          export const read = module.read.effect(({ context }) => {
            const { deps } = context;
            return deps.reader.read();
          });
        `,
        "services/computed-raw-lane/src/service/modules/catalog/router/read.router.ts": `
          import { module } from "../module";
          export const read = module.read.effect(({ context }) => context["deps"].reader.read());
        `,
        "services/renamed-context/src/service/modules/catalog/router/read.router.ts": `
          import { module } from "../module";
          export const read = module.read.effect(({ context: raw }) => raw.deps.reader.read());
        `,
        "services/nested-destructured-context/src/service/modules/catalog/router/read.router.ts": `
          import { module } from "../module";
          export const read = module.read.effect(({ context: { deps } }) =>
            deps.reader.read()
          );
        `,
        "services/renamed-computed-context/src/service/modules/catalog/router/read.router.ts": `
          import { module } from "../module";
          export const read = module.read.effect(({ context: raw }) =>
            raw["deps"].reader.read()
          );
        `,
        "services/multiple/src/service/modules/catalog/module.ts": `
          import { service } from "../../impl";
          export const module = service.catalog
            .use(async ({ context, next }) =>
              next({ context: { reader: context.deps.reader } })
            )
            .use(async ({ context, next }) =>
              next({ context: { traceId: context.invocation.traceId } })
            );
        `,
        "services/empty/src/service/modules/catalog/module.ts": `
          import { service } from "../../impl";
          export const module = service.catalog.use(async ({ context, next }) =>
            next({ context: {} })
          );
        `,
        "services/reserved/src/service/modules/catalog/module.ts": `
          import { service } from "../../impl";
          export const module = service.catalog.use(async ({ context, next }) =>
            next({ context: { deps: context.deps.reader } })
          );
        `,
        "services/guard/src/service/modules/catalog/module.ts": `
          import { service } from "../../impl";
          export const module = service.catalog.use(async ({ context, next }) => {
            if (!context.scope.workspaceId) throw new Error("missing workspace");
            return next({ context: { reader: context.deps.reader } });
          });
        `,
        "services/call/src/service/modules/catalog/module.ts": `
          import { service } from "../../impl";
          export const module = service.catalog.use(async ({ context, next }) =>
            next({ context: { reader: select(context.deps.reader) } })
          );
        `,
        "services/new/src/service/modules/catalog/module.ts": `
          import { service } from "../../impl";
          export const module = service.catalog.use(async ({ context, next }) =>
            next({ context: { reader: new Reader(context.deps.reader) } })
          );
        `,
        "services/await/src/service/modules/catalog/module.ts": `
          import { service } from "../../impl";
          export const module = service.catalog.use(async ({ context, next }) =>
            next({ context: { reader: await context.deps.reader } })
          );
        `,
        "services/literal/src/service/modules/catalog/module.ts": `
          import { service } from "../../impl";
          export const module = service.catalog.use(async ({ context, next }) =>
            next({ context: { mode: "reader" } })
          );
        `,
        "services/spread/src/service/modules/catalog/module.ts": `
          import { service } from "../../impl";
          export const module = service.catalog.use(async ({ context, next }) =>
            next({ context: { ...context.provided } })
          );
        `,
        "services/shorthand/src/service/modules/catalog/module.ts": `
          import { service } from "../../impl";
          const reader = service;
          export const module = service.catalog.use(async ({ context, next }) =>
            next({ context: { reader } })
          );
        `,
        "services/computed-key/src/service/modules/catalog/module.ts": `
          import { service } from "../../impl";
          export const module = service.catalog.use(async ({ context, next }) =>
            next({ context: { [context.config.key]: context.deps.reader } })
          );
        `,
        "services/computed-value/src/service/modules/catalog/module.ts": `
          import { service } from "../../impl";
          export const module = service.catalog.use(async ({ context, next }) =>
            next({ context: { reader: context.deps[context.config.key] } })
          );
        `,
        "services/whole-lane/src/service/modules/catalog/module.ts": `
          import { service } from "../../impl";
          export const module = service.catalog.use(async ({ context, next }) =>
            next({ context: { allDependencies: context.deps } })
          );
        `,
        "services/foreign-root/src/service/modules/catalog/module.ts": `
          import { service } from "../../impl";
          export const module = service.catalog.use(async ({ context, next }) =>
            next({ context: { reader: registry.reader } })
          );
        `,
        "services/unspecialized-provider/src/service/base.ts": `
          export const createServiceProvider = service.createProvider;
        `,
        "services/local-provider-generic/src/service/base.ts": `
          export type Service = { ExecutionContext: {} };
          export const createServiceProvider =
            service.createProvider<Service["ExecutionContext"]>;
        `,
        "services/local-provider-generic/src/service/middleware/stores.middleware.ts": `
          import { createServiceProvider } from "../base";
          type ProvidedStores = { readonly tasksStore: TasksStore };
          /** Acquires the service-owned stores. */
          export const stores =
            createServiceProvider<Service["ExecutionContext"]>()
              .middleware<ProvidedStores>(handler);
        `,
        "services/module-provider/src/service/base.ts": `
          export type Service = { ExecutionContext: {} };
          export const createServiceProvider =
            service.createProvider<Service["ExecutionContext"]>;
        `,
        "services/module-provider/src/service/modules/catalog/middleware/stores.middleware.ts": `
          import { createServiceProvider } from "../../../base";
          type ProvidedStores = { readonly tasksStore: TasksStore };
          /** Acquires the service-owned stores. */
          export const stores =
            createServiceProvider().middleware<ProvidedStores>(handler);
        `,
      },
      [rule]
    );

    const result = await check(root, [rule]);
    expect(result.exitCode).toBe(0);
    const paths = diagnostics(result.report, rule).map((diagnostic) => diagnostic.path);
    for (const path of [
      "services/nonterminal/src/service/modules/catalog/module.ts",
      "services/missing-curation/src/service/modules/catalog/module.ts",
      "services/raw-lane/src/service/modules/catalog/router/read.router.ts",
      "services/raw-lane-flat/src/service/modules/catalog/router.ts",
      "services/destructured-raw-lane/src/service/modules/catalog/router/read.router.ts",
      "services/computed-raw-lane/src/service/modules/catalog/router/read.router.ts",
      "services/renamed-context/src/service/modules/catalog/router/read.router.ts",
      "services/nested-destructured-context/src/service/modules/catalog/router/read.router.ts",
      "services/renamed-computed-context/src/service/modules/catalog/router/read.router.ts",
      "services/multiple/src/service/modules/catalog/module.ts",
      "services/empty/src/service/modules/catalog/module.ts",
      "services/reserved/src/service/modules/catalog/module.ts",
      "services/guard/src/service/modules/catalog/module.ts",
      "services/call/src/service/modules/catalog/module.ts",
      "services/new/src/service/modules/catalog/module.ts",
      "services/await/src/service/modules/catalog/module.ts",
      "services/literal/src/service/modules/catalog/module.ts",
      "services/spread/src/service/modules/catalog/module.ts",
      "services/shorthand/src/service/modules/catalog/module.ts",
      "services/computed-key/src/service/modules/catalog/module.ts",
      "services/computed-value/src/service/modules/catalog/module.ts",
      "services/whole-lane/src/service/modules/catalog/module.ts",
      "services/foreign-root/src/service/modules/catalog/module.ts",
      "services/unspecialized-provider/src/service/base.ts",
      "services/local-provider-generic/src/service/middleware/stores.middleware.ts",
      "services/module-provider/src/service/modules/catalog/middleware/stores.middleware.ts",
    ]) {
      expect(paths).toContain(path);
    }
  });

  it("keeps standalone service proof imports downstream from production source", async () => {
    const rule = "require_service_proof_isolation";
    const root = await createFixture(
      {
        "services/jobs/src/service/modules/catalog/router/read.router.ts": `
          import { catalogFixture } from "../../../../../test/support/modules/catalog/fixture";
          export const read = catalogFixture;
        `,
        "services/jobs/src/service/model/policy/load-proof.ts": `
          export const proofPath = require.resolve(
            \`../../../test/support/service/fixture\`
          );
        `,
        "services/jobs/src/service/model/policy/contest.ts": `
          import { contestPolicy } from "./contest/policy";
          export { contestPolicy };
        `,
        "services/jobs/test/behavior/catalog.test.ts": `
          import { createClient } from "../../src/client";
          export { createClient };
        `,
        "plugins/server/api/catalog/src/service/modules/jobs/router/read.router.ts": `
          import { jobsFixture } from "../../../../test/support/modules/jobs/fixture";
          export const read = jobsFixture;
        `,
      },
      [rule]
    );

    const result = await check(root, [rule]);
    expect(result.exitCode).toBe(1);
    expect(result.report.ok).toBe(false);
    const paths = diagnostics(result.report, rule).map((diagnostic) => diagnostic.path);
    for (const path of [
      "services/jobs/src/service/modules/catalog/router/read.router.ts",
      "services/jobs/src/service/model/policy/load-proof.ts",
    ]) {
      expect(paths).toContain(path);
    }
    for (const path of [
      "services/jobs/src/service/model/policy/contest.ts",
      "services/jobs/test/behavior/catalog.test.ts",
      "plugins/server/api/catalog/src/service/modules/jobs/router/read.router.ts",
    ]) {
      expect(paths).not.toContain(path);
    }
  });

  it("keeps private aliases inside their owner across TSX and template loaders", async () => {
    const rule = "require_service_private_alias_ownership";
    const root = await createFixture(
      {
        "apps/web/src/features/jobs.tsx": `
          import { router } from "#jobs-service/router";
          export const Jobs = () => <output>{String(router)}</output>;
        `,
        "services/jobs/src/client.tsx": `
          import { router } from "#jobs-service/router";
          export const JobsClient = () => <output>{String(router)}</output>;
        `,
        "apps/server/src/runtime/jobs-import.ts": `
          export const jobs = import(\`#jobs-service/router\`);
        `,
        "apps/server/src/runtime/jobs-require.ts": `
          export const jobs = require(\`#jobs-service/router\`);
        `,
        "apps/server/src/runtime/jobs-resolve.ts": `
          export const jobs = require.resolve(\`#jobs-service/router\`);
        `,
        "apps/server/src/runtime/catalog-api.ts": `
          export const catalog = require(\`#catalog-api/service/impl\`);
        `,
        "services/jobs/src/runtime/import.ts": `
          export const jobs = import(\`#jobs-service/router\`);
        `,
        "services/jobs/src/runtime/require.ts": `
          export const jobs = require(\`#jobs-service/router\`);
        `,
        "services/jobs/src/runtime/resolve.ts": `
          export const jobs = require.resolve(\`#jobs-service/router\`);
        `,
        "plugins/server/api/catalog/src/runtime.ts": `
          export const catalog = require(\`#catalog-api/service/impl\`);
        `,
        "apps/server/src/runtime/jobs-computed.ts": `
          const owner = "jobs";
          export const jobs = import(\`#\${owner}-service/router\`);
        `,
      },
      [rule]
    );

    const result = await check(root, [rule]);
    expect(result.exitCode).toBe(1);
    expect(result.report.ok).toBe(false);
    const paths = diagnostics(result.report, rule).map((diagnostic) => diagnostic.path);
    for (const path of [
      "apps/web/src/features/jobs.tsx",
      "apps/server/src/runtime/jobs-import.ts",
      "apps/server/src/runtime/jobs-require.ts",
      "apps/server/src/runtime/jobs-resolve.ts",
      "apps/server/src/runtime/catalog-api.ts",
    ]) {
      expect(paths).toContain(path);
    }
    for (const path of [
      "services/jobs/src/client.tsx",
      "services/jobs/src/runtime/import.ts",
      "services/jobs/src/runtime/require.ts",
      "services/jobs/src/runtime/resolve.ts",
      "plugins/server/api/catalog/src/runtime.ts",
      "apps/server/src/runtime/jobs-computed.ts",
    ]) {
      expect(paths).not.toContain(path);
    }
  });

  it("seals private service implementation paths from public consumers", async () => {
    const rule = "require_service_public_consumer_sealing";
    const root = await createFixture(
      {
        "apps/web/src/features/jobs.tsx": `
          import { router } from "../../../../services/jobs/src/service/router";
          export const Jobs = () => <output>{String(router)}</output>;
        `,
        "services/discovery/src/service/jobs.ts": `
          import { router } from "../../../job-search/src/service/router";
          export { router };
        `,
        "services/discovery/src/service/jobs-template.ts": `
          export const contractPath = require.resolve(
            \`../../../job-search/src/service/contract\`
          );
        `,
        "tools/ops/src/jobs.ts": `
          export const jobs = require("../../../services/jobs/src/service/router");
        `,
        "scripts/ops/jobs.ts": `
          export { contract } from "../../services/jobs/src/service/contract";
        `,
        "service-consumer.ts": `
          import { router } from "./services/jobs/src/service/router";
          export { router };
        `,
        "apps/web/src/features/jobs-alias.ts": `
          import { router } from "#jobs-service/router";
          export { router };
        `,
        "services/jobs/test/mechanics/client.test.ts": `
          import { createJobsStore } from "#jobs-service/modules/jobs/db/memory/jobs.store";
          export { createJobsStore };
        `,
        "services/jobs/test/mechanics/private-service.test.ts": `
          import { router } from "../../src/service/router";
          export { router };
        `,
        "services/discovery/test/fixtures/services/jobs/src/client.test.ts": `
          import { router } from "../../../../job-search/src/service/router";
          export { router };
        `,
        "plugins/server/api/catalog/src/service/modules/jobs/router/read.router.ts": `
          import type { Client as JobsClient } from "#jobs/client";
          export type { JobsClient };
        `,
        "services/discovery/src/service/legacy-owner.ts": `
          import { router } from "../../../Jobs/src/service/router";
          export { router };
        `,
      },
      [rule]
    );

    const result = await check(root, [rule]);
    expect(result.exitCode).toBe(1);
    expect(result.report.ok).toBe(false);
    const paths = diagnostics(result.report, rule).map((diagnostic) => diagnostic.path);
    for (const path of [
      "apps/web/src/features/jobs.tsx",
      "services/discovery/src/service/jobs.ts",
      "services/discovery/src/service/jobs-template.ts",
      "tools/ops/src/jobs.ts",
      "scripts/ops/jobs.ts",
      "service-consumer.ts",
    ]) {
      expect(paths).toContain(path);
    }
    for (const path of [
      "apps/web/src/features/jobs-alias.ts",
      "services/jobs/test/mechanics/client.test.ts",
      "services/jobs/test/mechanics/private-service.test.ts",
      "services/discovery/test/fixtures/services/jobs/src/client.test.ts",
      "plugins/server/api/catalog/src/service/modules/jobs/router/read.router.ts",
      "services/discovery/src/service/legacy-owner.ts",
    ]) {
      expect(paths).not.toContain(path);
    }
  });

  it("keeps concrete platform acquisition behind qualified hosts, resources, and providers", async () => {
    const rule = "require_service_boundary_platform_independence";
    const root = await createFixture(
      {
        "services/jobs/src/service/router.ts": `
          import { randomUUID } from "node:crypto";
          export const router = { randomUUID };
        `,
        "services/jobs/src/service/modules/catalog/router/create.router.ts": `
          const sqlite = import("bun:sqlite");
          export { sqlite };
        `,
        "services/jobs/src/service/modules/catalog/model/helpers/files.ts": `
          import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
          export const files = NodeFileSystem.layer;
        `,
        "plugins/server/api/catalog/src/service/model/helpers/read.ts": `
          const fs = require("node:fs");
          export { fs };
        `,
        "plugins/server/api/catalog/src/service/model/helpers/bun-files.ts": `
          import * as BunFileSystem from "@effect/platform-bun/BunFileSystem";
          export const files = BunFileSystem.layer;
        `,
        "services/valid/src/service/model/ports/files.ts": `
          import type { FileSystem } from "@effect/platform/FileSystem";
          export type Files = FileSystem;
        `,
        "services/jobs/test/platform.test.ts": `
          import { mkdtemp } from "node:fs/promises";
          export { mkdtemp };
        `,
        "resources/catalog/providers/node/index.ts": `
          import { readFile } from "node:fs/promises";
          export { readFile };
        `,
      },
      [rule]
    );

    const result = await check(root, [rule]);
    expect(result.exitCode).toBe(1);
    expect(result.report.ok).toBe(false);
    const paths = diagnostics(result.report, rule).map((diagnostic) => diagnostic.path);
    for (const path of [
      "services/jobs/src/service/router.ts",
      "services/jobs/src/service/modules/catalog/router/create.router.ts",
      "services/jobs/src/service/modules/catalog/model/helpers/files.ts",
      "plugins/server/api/catalog/src/service/model/helpers/read.ts",
      "plugins/server/api/catalog/src/service/model/helpers/bun-files.ts",
    ]) {
      expect(paths).toContain(path);
    }
    for (const path of [
      "services/jobs/test/platform.test.ts",
      "services/valid/src/service/model/ports/files.ts",
      "resources/catalog/providers/node/index.ts",
    ]) {
      expect(paths).not.toContain(path);
    }
  });

  it("keeps runtime authority singular while preserving mixed named imports", async () => {
    const composition = "require_service_orpc_composition";
    const context = "require_service_context_boundaries";
    const isolation = "require_service_module_isolation";
    const authorship = "require_service_router_authorship";
    const root = await createFixture(
      {
        "services/type-only/src/service/base.ts": `
          import type { implementEffect } from "effect-orpc";
          type Dependencies = {};
          export type InitialContext = {};
          export type Context = {};
          export const base = implementEffect(contract, layer);
        `,
        "services/mixed/src/service/base.ts": `
          import { implementEffect, type EffectHandler } from "effect-orpc";
          type Dependencies = {};
          export type InitialContext = {};
          export type Context = {};
          export const base = implementEffect(contract, layer).$context<InitialContext>();
          export function createMiddleware() {
            return base;
          }
        `,
        "services/duplicate/src/service/base.ts": `
          import { implementEffect } from "effect-orpc";
          type Dependencies = {};
          export type InitialContext = {};
          export type Context = {};
          export const base = implementEffect(contract, layer);
          const second = implementEffect(contract, layer);
        `,
        "services/mixed/src/service/middleware/type-only.middleware.ts": `
          import type { os } from "@orpc/server";
          export const access = os.middleware(handler);
        `,
        "services/mixed/src/service/middleware/mixed.middleware.ts": `
          import { createMiddleware, type InitialContext } from "../base";
          /** Admits service access. */
          export const access = createMiddleware().middleware(handler);
        `,
        "services/mixed/src/service/modules/catalog/model/helpers/second.ts": `
          import { implementEffect } from "effect-orpc";
          export const second = implementEffect(contract, layer);
        `,
        "services/module-type/src/service/modules/catalog/module.ts": `
          import type { service } from "../../impl";
          export const module = service.catalog;
        `,
        "services/module-mixed/src/service/modules/catalog/module.ts": `
          import { service, type ServiceContext } from "../../impl";
          export const module = service.catalog;
        `,
        "services/root-invalid/src/service/router.ts": `
          import { service } from "./impl";
          export const router = service.catalog.handler(handler);
        `,
        "services/root-valid/src/service/router.ts": `
          import type { Router } from "@orpc/server";
          import type { contract } from "./contract";
          import {
            router as catalog,
            type CatalogRouter,
          } from "./modules/catalog/router";
          export const router = { catalog } satisfies Router<typeof contract, never>;
        `,
        "services/root-invalid-context/src/service/router.ts": `
          import type { Router } from "@orpc/server";
          import type { contract } from "./contract";
          import { router as catalog } from "./modules/catalog/router";
          export const router = { catalog } satisfies Router<typeof contract, Context>;
        `,
        "services/root-invalid-foreign-contract/src/service/router.ts": `
          import type { Router } from "@orpc/server";
          import { contract } from "./foreign-contract";
          import { router as catalog } from "./modules/catalog/router";
          export const router = { catalog } satisfies Router<typeof contract, never>;
        `,
        "services/root-invalid-decoy/src/service/router.ts": `
          import type { Router as NativeRouter } from "@orpc/server";
          import type { Router } from "./decoy";
          import type { contract } from "./contract";
          import { router as catalog } from "./modules/catalog/router";
          export const router = { catalog } satisfies Router<typeof contract, never>;
        `,
        "services/root-invalid-default-contract/src/service/router.ts": `
          import type { Router } from "@orpc/server";
          import extra, { type contract } from "./contract";
          import { router as catalog } from "./modules/catalog/router";
          export const router = { catalog } satisfies Router<typeof contract, never>;
        `,
        "services/root-invalid-default-router/src/service/router.ts": `
          import type { Router } from "@orpc/server";
          import type { contract } from "./contract";
          import extra, { router as catalog } from "./modules/catalog/router";
          export const router = { catalog } satisfies Router<typeof contract, never>;
        `,
        "services/root-invalid-helper/src/service/router.ts": `
          import type { Router } from "@orpc/server";
          import type { contract } from "./contract";
          import { router as catalog } from "./modules/catalog/router";
          const select = () => catalog;
          export const router = { catalog } satisfies Router<typeof contract, never>;
        `,
        "services/root-invalid-call/src/service/router.ts": `
          import type { Router } from "@orpc/server";
          import type { contract } from "./contract";
          import { router as catalog } from "./modules/catalog/router";
          export const router = {
            catalog: select(catalog),
          } satisfies Router<typeof contract, never>;
        `,
        "services/root-invalid-alias/src/service/router.ts": `
          import type { Router } from "@orpc/server";
          import type { contract } from "./contract";
          import { router as catalog } from "./modules/catalog/router";
          export const router = {
            catalog: catalog,
          } satisfies Router<typeof contract, never>;
        `,
        "services/root-valid-alias/src/service/router.ts": `
          import type { Router as ORPCRouter } from "@orpc/server";
          import type { contract } from "./contract";
          import { router as catalog } from "./modules/catalog/router";
          export const router = { catalog } satisfies ORPCRouter<typeof contract, never>;
        `,
        "plugins/server/api/type-only/src/service/impl.ts": `
          import type { implement } from "@orpc/server";
          export const service = implement(contract).$context<Context>();
        `,
        "plugins/server/api/mixed/src/service/impl.ts": `
          import { implement, type Middleware } from "@orpc/server";
          export const service = implement(contract).$context<Context>();
        `,
        "plugins/server/api/mixed/src/service/modules/catalog/model/helpers/second.ts": `
          import { implement } from "@orpc/server";
          export const second = implement(contract).$context<Context>();
        `,
      },
      [composition, context, isolation, authorship]
    );

    const compositionResult = await check(root, [composition]);
    expect(compositionResult.exitCode).toBe(0);
    const compositionPaths = diagnostics(compositionResult.report, composition).map(
      (diagnostic) => diagnostic.path
    );
    for (const path of [
      "services/type-only/src/service/base.ts",
      "services/duplicate/src/service/base.ts",
      "services/mixed/src/service/modules/catalog/model/helpers/second.ts",
      "services/module-type/src/service/modules/catalog/module.ts",
      "services/root-invalid/src/service/router.ts",
      "services/root-invalid-context/src/service/router.ts",
      "services/root-invalid-foreign-contract/src/service/router.ts",
      "services/root-invalid-decoy/src/service/router.ts",
      "services/root-invalid-default-contract/src/service/router.ts",
      "services/root-invalid-default-router/src/service/router.ts",
      "services/root-invalid-helper/src/service/router.ts",
      "services/root-invalid-call/src/service/router.ts",
      "services/root-invalid-alias/src/service/router.ts",
      "plugins/server/api/type-only/src/service/impl.ts",
      "plugins/server/api/mixed/src/service/modules/catalog/model/helpers/second.ts",
    ]) {
      expect(compositionPaths).toContain(path);
    }
    for (const path of [
      "services/mixed/src/service/base.ts",
      "services/module-mixed/src/service/modules/catalog/module.ts",
      "services/root-valid/src/service/router.ts",
      "services/root-valid-alias/src/service/router.ts",
      "plugins/server/api/mixed/src/service/impl.ts",
    ]) {
      expect(compositionPaths).not.toContain(path);
    }

    const contextResult = await check(root, [context]);
    expect(contextResult.exitCode).toBe(0);
    const contextPaths = diagnostics(contextResult.report, context).map(
      (diagnostic) => diagnostic.path
    );
    expect(contextPaths).toContain("services/mixed/src/service/middleware/type-only.middleware.ts");
    expect(contextPaths).not.toContain("services/mixed/src/service/middleware/mixed.middleware.ts");

    const isolationResult = await check(root, [isolation]);
    const isolationPaths = diagnostics(isolationResult.report, isolation).map(
      (diagnostic) => diagnostic.path
    );
    expect(isolationPaths).not.toContain(
      "services/module-mixed/src/service/modules/catalog/module.ts"
    );
    expect(isolationPaths).not.toContain("services/root-valid/src/service/router.ts");

    const combinedResult = await check(root, [composition, context, isolation, authorship]);
    expect(combinedResult.report.rules.map((rule) => rule.disposition.kind)).not.toContain(
      "execution-failed"
    );
  }, 15_000);

  it("rejects undocumented contract properties in standalone and API services", async () => {
    const serviceRule = "require_service_contract_property_descriptions";
    const apiRule = "require_api_service_contract_property_descriptions";
    const root = await createFixture(
      {
        "services/orders/src/service/modules/catalog/contract.ts": `
          import { Type } from "typebox";
          export const contract = Type.Object({ query: Type.String() });
        `,
        "plugins/server/api/catalog/src/service/modules/search/contract.ts": `
          import { Type } from "typebox";
          export const contract = Type.Object({ query: Type.String() });
        `,
      },
      [serviceRule, apiRule]
    );

    const result = await check(root, [serviceRule, apiRule]);
    expect(result.exitCode).toBe(1);
    expect(diagnostics(result.report, serviceRule).map((diagnostic) => diagnostic.path)).toContain(
      "services/orders/src/service/modules/catalog/contract.ts"
    );
    expect(diagnostics(result.report, apiRule).map((diagnostic) => diagnostic.path)).toContain(
      "plugins/server/api/catalog/src/service/modules/search/contract.ts"
    );
  });

  it("admits described and named-schema contract properties in both service forms", async () => {
    const serviceRule = "require_service_contract_property_descriptions";
    const apiRule = "require_api_service_contract_property_descriptions";
    const describedContract = `
      import { Type } from "typebox";
      const QuerySchema = Type.String({ description: "Search text." });
      export const contract = Type.Object({
        query: QuerySchema,
        limit: Type.Optional(Type.Integer({ description: "Maximum results." })),
      });
    `;
    const root = await createFixture(
      {
        "services/orders/src/service/modules/catalog/contract.ts": describedContract,
        "plugins/server/api/catalog/src/service/modules/search/contract.ts": describedContract,
      },
      [serviceRule, apiRule]
    );

    const result = await check(root, [serviceRule, apiRule]);
    expect(result.exitCode).toBe(0);
    expect(diagnostics(result.report, serviceRule)).toEqual([]);
    expect(diagnostics(result.report, apiRule)).toEqual([]);
  });
});
