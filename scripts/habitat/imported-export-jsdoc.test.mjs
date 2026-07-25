import { afterEach, describe, expect, it } from "bun:test";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  createImportedExportJSDocPrograms,
  findRepositoryImportedExportJSDocViolations,
} from "../../.habitat/blueprints/typescript-source/require_imported_exports_have_jsdoc/check.mjs";
import { createHabitatTestRoot, removeHabitatTestRoot } from "./test-fixture.mjs";

const TEMP_PREFIX = "rawr-habitat-imported-jsdoc-test-";
const roots = /** @type {string[]} */ ([]);

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await removeHabitatTestRoot(root, TEMP_PREFIX);
  }
});

/** @param {Record<string, string>} files */
async function writeFixture(files) {
  const root = await createHabitatTestRoot(TEMP_PREFIX);
  roots.push(root);
  for (const [relativePath, contents] of Object.entries(files)) {
    const target = join(root, relativePath);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, contents);
  }
  return root;
}

function baseConfig() {
  return JSON.stringify({
    compilerOptions: {
      module: "ESNext",
      moduleResolution: "Bundler",
      strict: true,
      target: "ES2022",
    },
  });
}

function projectConfig(paths = {}) {
  return JSON.stringify({
    extends: "../../tsconfig.base.json",
    compilerOptions: {
      allowJs: true,
      baseUrl: ".",
      checkJs: true,
      paths,
    },
    include: [
      "src/**/*",
      "test/**/*",
      "build/**/*",
      "fixtures/**/*",
      "generated/**/*",
      "proof/**/*",
    ],
  });
}

/** @param {string} root */
function findViolations(root) {
  return findRepositoryImportedExportJSDocViolations(createImportedExportJSDocPrograms(root), root);
}

describe("imported-export JSDoc source law", () => {
  it("uses project-local aliases and follows static export identities", async () => {
    const root = await writeFixture({
      "tsconfig.base.json": baseConfig(),
      "packages/example/tsconfig.json": projectConfig({
        "#barrel": ["src/barrel.ts"],
        "#owner": ["src/owner.ts"],
      }),
      "packages/example/src/owner.ts": `
        export const named = 1;
        export default function defaultOperation() { return 2; }
        export const renamedSource = 3;
        export const namespaceStatic = 4;
        export const computedOnly = 5;
        export const wholeNamespaceOnly = 6;
        export const localOnly = 7;
        export type ImportedShape = { value: string };
      `,
      "packages/example/src/barrel.ts": `
        export { renamedSource as renamed } from "#owner";
      `,
      "packages/example/src/consumer.ts": `
        import defaultOperation, { named, type ImportedShape } from "#owner";
        import { renamed } from "#barrel";
        import * as owner from "#owner";

        const dynamicKey: keyof typeof owner = "computedOnly";
        function consumeNamespace(value: typeof owner) { return value; }

        void [defaultOperation(), named, renamed, owner.namespaceStatic];
        void owner[dynamicKey];
        void consumeNamespace(owner);
        const shape: ImportedShape = { value: "consumed" };
        void shape;
      `,
    });

    const violations = findViolations(root);
    const missingSymbols = violations
      .filter((violation) => violation.code === "MISSING_IMPORTED_EXPORT_JSDOC")
      .map((violation) => violation.symbol)
      .sort();

    expect(missingSymbols).toEqual([
      "ImportedShape",
      "defaultOperation",
      "named",
      "namespaceStatic",
      "renamedSource",
    ]);
    expect(missingSymbols).not.toContain("computedOnly");
    expect(missingSymbols).not.toContain("wholeNamespaceOnly");
    expect(missingSymbols).not.toContain("localOnly");
  });

  it("applies the relation to JavaScript admitted by an owning project", async () => {
    const root = await writeFixture({
      "tsconfig.base.json": baseConfig(),
      "packages/example/tsconfig.json": projectConfig({
        "#owner": ["src/owner.mjs"],
      }),
      "packages/example/src/owner.mjs": "export const javascriptValue = 1;",
      "packages/example/src/consumer.jsx": `
        import { javascriptValue } from "#owner";
        void javascriptValue;
      `,
    });

    expect(findViolations(root)).toEqual([
      expect.objectContaining({
        code: "MISSING_IMPORTED_EXPORT_JSDOC",
        file: "packages/example/src/owner.mjs",
        symbol: "javascriptValue",
      }),
    ]);
  });

  it("excludes test, fixture, build, generated, and proof-only projects", async () => {
    const root = await writeFixture({
      "tsconfig.base.json": baseConfig(),
      "packages/example/tsconfig.json": projectConfig({
        "#owner": ["src/owner.ts"],
      }),
      "packages/example/src/owner.ts": "export const productionOnly = 1;",
      "packages/example/test/consumer.ts": `
        import { productionOnly } from "#owner";
        void productionOnly;
      `,
      "packages/example/build/consumer.ts": `
        import { productionOnly } from "#owner";
        void productionOnly;
      `,
      "packages/example/fixtures/consumer.ts": `
        import { productionOnly } from "#owner";
        void productionOnly;
      `,
      "packages/example/generated/consumer.ts": `
        import { productionOnly } from "#owner";
        void productionOnly;
      `,
      "packages/example/proof/consumer.ts": `
        import { productionOnly } from "#owner";
        void productionOnly;
      `,
      "packages/proof/tsconfig.json": "{ this is intentionally invalid",
      "packages/proof/proof.ts": "export const proof = true;",
    });

    const projects = [...createImportedExportJSDocPrograms(root)];
    const rootFiles = projects.flatMap(({ program }) =>
      program.getRootFileNames().map((fileName) => fileName.replaceAll("\\", "/"))
    );

    expect(rootFiles.some((fileName) => fileName.endsWith("/test/consumer.ts"))).toBe(true);
    expect(rootFiles.some((fileName) => fileName.endsWith("/build/consumer.ts"))).toBe(true);
    expect(rootFiles.some((fileName) => fileName.endsWith("/fixtures/consumer.ts"))).toBe(true);
    expect(rootFiles.some((fileName) => fileName.endsWith("/generated/consumer.ts"))).toBe(true);
    expect(rootFiles.some((fileName) => fileName.endsWith("/proof/consumer.ts"))).toBe(true);
    expect(findRepositoryImportedExportJSDocViolations(projects, root)).toEqual([]);
  });

  it("rejects placeholder documentation on the consumed symbol itself", async () => {
    const root = await writeFixture({
      "tsconfig.base.json": baseConfig(),
      "packages/example/tsconfig.json": projectConfig({
        "#owner": ["src/owner.ts"],
      }),
      "packages/example/src/owner.ts": `
        /** TODO */
        export const placeholderSymbol = 1;
      `,
      "packages/example/src/consumer.ts": `
        import { placeholderSymbol } from "#owner";
        void placeholderSymbol;
      `,
    });

    expect(findViolations(root)).toEqual([
      expect.objectContaining({
        code: "MISSING_IMPORTED_EXPORT_JSDOC",
        symbol: "placeholderSymbol",
      }),
    ]);
  });

  it("requires actual useful parameter tags only for wide value-callable exports", async () => {
    const root = await writeFixture({
      "tsconfig.base.json": baseConfig(),
      "packages/example/tsconfig.json": projectConfig({
        "#owner": ["src/owner.ts"],
      }),
      "packages/example/src/owner.ts": `
        /** Owns the narrow operation used by the consumer. */
        export function narrow(one: string, two: string, three: string) {
          return one + two + three;
        }

        /**
         * Owns the fully documented wide operation.
         * @param one First input carried into the operation.
         * @param two Second input carried into the operation.
         * @param three Third input carried into the operation.
         * @param four Fourth input carried into the operation.
         */
        export function complete(one: string, two: string, three: string, four: string) {
          return one + two + three + four;
        }

        /** Defines a type-only callback consumed by another source file. */
        export type TypeOnly = (
          one: string,
          two: string,
          three: string,
          four: string
        ) => string;
      `,
      "packages/example/src/consumer.ts": `
        import { complete, narrow, type TypeOnly } from "#owner";
        const callback: TypeOnly = complete;
        void [callback, narrow];
      `,
    });

    expect(findViolations(root)).toEqual([]);
  });

  it("rejects missing, blank, placeholder, and wrong-name parameter tags", async () => {
    const root = await writeFixture({
      "tsconfig.base.json": baseConfig(),
      "packages/example/tsconfig.json": projectConfig({
        "#owner": ["src/owner.ts"],
      }),
      "packages/example/src/owner.ts": `
        /** Owns a wide operation whose tags are absent. */
        export function missing(one: string, two: string, three: string, four: string) {
          return one + two + three + four;
        }

        /**
         * Owns a wide operation whose first tag is blank.
         * @param one
         * @param two Useful second input.
         * @param three Useful third input.
         * @param four Useful fourth input.
         */
        export function blank(one: string, two: string, three: string, four: string) {
          return one + two + three + four;
        }

        /**
         * Owns a wide operation whose first tag is a placeholder.
         * @param one TODO
         * @param two Useful second input.
         * @param three Useful third input.
         * @param four Useful fourth input.
         */
        export function placeholder(one: string, two: string, three: string, four: string) {
          return one + two + three + four;
        }

        /**
         * Owns a wide operation whose first parameter has no matching tag.
         * @param notOne A tag for a name the function does not declare.
         * @param two Useful second input.
         * @param three Useful third input.
         * @param four Useful fourth input.
         */
        export function wrongName(one: string, two: string, three: string, four: string) {
          return one + two + three + four;
        }
      `,
      "packages/example/src/consumer.ts": `
        import { blank, missing, placeholder, wrongName } from "#owner";
        void [blank, missing, placeholder, wrongName];
      `,
    });

    const violations = findViolations(root);
    const parametersBySymbol = Object.fromEntries(
      ["blank", "missing", "placeholder", "wrongName"].map((symbol) => [
        symbol,
        violations
          .filter(
            (violation) =>
              violation.code === "MISSING_IMPORTED_EXPORT_PARAM_JSDOC" &&
              violation.symbol === symbol
          )
          .map((violation) => violation.parameter)
          .sort(),
      ])
    );

    expect(parametersBySymbol).toEqual({
      blank: ["one"],
      missing: ["four", "one", "three", "two"],
      placeholder: ["one"],
      wrongName: ["one"],
    });
  });

  it("deduplicates owner findings deterministically across project programs", async () => {
    const root = await writeFixture({
      "tsconfig.base.json": baseConfig(),
      "packages/owner/tsconfig.json": projectConfig(),
      "packages/owner/src/owner.ts": "export const sharedValue = 1;",
      "packages/a/tsconfig.json": projectConfig({
        "@fixture/owner": ["../owner/src/owner.ts"],
      }),
      "packages/a/src/consumer.ts": `
        import { sharedValue } from "@fixture/owner";
        void sharedValue;
      `,
      "packages/b/tsconfig.json": projectConfig({
        "@fixture/owner": ["../owner/src/owner.ts"],
      }),
      "packages/b/src/consumer.ts": `
        import { sharedValue } from "@fixture/owner";
        void sharedValue;
      `,
    });
    const projects = [...createImportedExportJSDocPrograms(root)];
    const forward = findRepositoryImportedExportJSDocViolations(projects, root);
    const reversed = findRepositoryImportedExportJSDocViolations([...projects].reverse(), root);

    expect(reversed).toEqual(forward);
    expect(forward).toHaveLength(1);
    expect(forward[0]).toMatchObject({
      code: "MISSING_IMPORTED_EXPORT_JSDOC",
      consumer: "packages/a/src/consumer.ts",
      file: "packages/owner/src/owner.ts",
      symbol: "sharedValue",
    });
  });
});
