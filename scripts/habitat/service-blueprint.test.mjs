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

/** @param {Record<string, string>} files @param {string[]} rules */
async function createFixture(files, rules) {
  const root = await createHabitatTestRoot(TEMP_PREFIX);
  roots.push(root);

  await mkdir(join(root, ".habitat"), { recursive: true });
  await cp(join(REPOSITORY_ROOT, ".habitat", "index.json"), join(root, ".habitat", "index.json"));
  await mkdir(join(root, "services"), { recursive: true });
  await mkdir(join(root, "plugins", "server", "api"), { recursive: true });
  await symlink(join(REPOSITORY_ROOT, "node_modules"), join(root, "node_modules"), "dir");
  for (const rule of rules) {
    await cp(
      join(REPOSITORY_ROOT, ".habitat", "blueprints", "service", rule),
      join(root, ".habitat", "blueprints", "service", rule),
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
  it("admits the canonical module router topology", async () => {
    const rules = ["require_service_spine_topology"];
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
      rules
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
          export const module = service.catalog.use(capabilities);
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
            .effect(({ context }) => context.catalog.find());
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

  it("keeps concrete platform acquisition behind resources and providers", async () => {
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
    expect(result.exitCode).toBe(0);
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
});
