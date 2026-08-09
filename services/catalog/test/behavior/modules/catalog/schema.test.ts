import { describe, expect, test } from "bun:test";
import { standard } from "@habitat-ai/sdk/service/schema";
import type { TSchema } from "typebox";
import { Value } from "typebox/value";
import {
  BlueprintDefinitionSchema,
  CompatibilityBaselineSchema,
  CompatibilityRuleSourceSchema,
  MAX_ROOT_PATTERN_ACQUISITION_DECLARATIONS,
  MAX_ROOT_PATTERNS_PER_DECLARATION,
} from "../../../../src/service/modules/catalog/model/dto/catalog";
import {
  CompatibilityStructureDocumentSchema,
  StructureDocumentSchema,
} from "../../../../src/service/modules/catalog/model/dto/structure";

type Coverage = {
  readonly kind: "exact-path";
  readonly patterns: readonly string[];
};

const coverage: Coverage = {
  kind: "exact-path",
  patterns: ["scripts/habitat/**/*.ts"],
};

describe("Habitat catalog schema projection", () => {
  test("projects and admits exactly one compatibility path-coverage entry", () => {
    expect(
      [[], [coverage], [coverage, coverage]].map((pathCoverage) =>
        Value.Check(CompatibilityRuleSourceSchema, compatibilityRule(pathCoverage))
      )
    ).toEqual([false, true, false]);

    expect(project(CompatibilityRuleSourceSchema)).toMatchObject({
      anyOf: [
        {
          properties: {
            pathCoverage: {
              type: "array",
              minItems: 1,
              maxItems: 1,
              items: { type: "object" },
            },
          },
        },
        {
          properties: {
            pathCoverage: {
              type: "array",
              minItems: 1,
              maxItems: 1,
              items: { type: "object" },
            },
          },
        },
      ],
    });
  });

  test("projects and admits only an empty compatibility baseline", () => {
    expect(Value.Check(CompatibilityBaselineSchema, [])).toBe(true);
    expect(Value.Check(CompatibilityBaselineSchema, [{}])).toBe(false);
    expect(project(CompatibilityBaselineSchema)).toMatchObject({
      type: "array",
      items: { not: {} },
      maxItems: 0,
    });
  });

  test("keeps structure DTO projections free of runtime refinements", () => {
    expect(containsRefinement(project(StructureDocumentSchema))).toBe(false);
    expect(containsRefinement(project(CompatibilityStructureDocumentSchema))).toBe(false);
  });

  test("projects a closed nonempty root-pattern acquisition relation", () => {
    const admitted = blueprintDefinition([
      { rootRole: "project", patterns: ["src/**/*.ts", "test/**/*.ts"] },
    ]);

    expect(Value.Check(BlueprintDefinitionSchema, admitted)).toBe(true);
    expect(
      Value.Check(
        BlueprintDefinitionSchema,
        blueprintDefinition([{ rootRole: "project", patterns: [] }])
      )
    ).toBe(false);
    expect(
      Value.Check(
        BlueprintDefinitionSchema,
        blueprintDefinition(
          Array.from({ length: MAX_ROOT_PATTERN_ACQUISITION_DECLARATIONS + 1 }, (_, index) => ({
            rootRole: `root_${index}`,
            patterns: ["src/**/*.ts"],
          }))
        )
      )
    ).toBe(false);
    expect(
      Value.Check(
        BlueprintDefinitionSchema,
        blueprintDefinition([
          {
            rootRole: "project",
            patterns: Array.from(
              { length: MAX_ROOT_PATTERNS_PER_DECLARATION + 1 },
              (_, index) => `src/part-${index}/**/*.ts`
            ),
          },
        ])
      )
    ).toBe(false);
    expect(
      Value.Check(BlueprintDefinitionSchema, {
        ...admitted,
        rules: [
          {
            ...admitted.rules[0],
            runner: {
              ...admitted.rules[0]?.runner,
              acquisition: {
                ...admitted.rules[0]?.runner.acquisition,
                rootPatterns: [
                  { rootRole: "project", patterns: ["src/**/*.ts"], unexpected: true },
                ],
              },
            },
          },
        ],
      })
    ).toBe(false);
    expect(project(BlueprintDefinitionSchema)).toMatchObject({
      properties: {
        rules: {
          items: {
            properties: {
              runner: {
                anyOf: expect.arrayContaining([
                  expect.objectContaining({
                    properties: expect.objectContaining({
                      acquisition: expect.objectContaining({
                        properties: expect.objectContaining({
                          rootPatterns: expect.objectContaining({
                            type: "array",
                            minItems: 1,
                            maxItems: MAX_ROOT_PATTERN_ACQUISITION_DECLARATIONS,
                            items: expect.objectContaining({
                              properties: expect.objectContaining({
                                patterns: expect.objectContaining({
                                  maxItems: MAX_ROOT_PATTERNS_PER_DECLARATION,
                                }),
                              }),
                            }),
                          }),
                        }),
                      }),
                    }),
                  }),
                ]),
              },
            },
          },
        },
      },
    });
  });
});

function compatibilityRule(pathCoverage: readonly Coverage[]) {
  return {
    schemaVersion: 2,
    id: "legacy_rule",
    title: "Require legacy rule",
    placement: { niche: "rawr", blueprint: "service", category: "boundary" },
    operation: { kind: "check" },
    ownerProject: "habitat",
    lane: "enforced",
    forbids: "an invalid fixture state",
    why: "The compatibility fixture must remain executable.",
    remediate: "Restore the fixture.",
    message: "Legacy rule found a violation.",
    pathCoverage,
    hookCheck: true,
    supportFiles: { baseline: ".habitat/legacy/legacy_rule/baseline.json" },
    runner: {
      name: "grit",
      files: { pattern: ".habitat/legacy/legacy_rule/pattern.md" },
      patternName: "legacy_rule",
      acquisition: { kind: "check", roots: ["scripts/habitat"] },
    },
  };
}

function blueprintDefinition(
  rootPatterns: readonly {
    readonly rootRole: string;
    readonly patterns: readonly string[];
  }[]
) {
  return {
    schemaVersion: 1,
    id: "package",
    version: 1,
    rules: [
      {
        id: "package_rule",
        lane: "enforced",
        message: "Package rule found a violation.",
        remediate: "Fix the package rule.",
        runner: {
          name: "grit",
          pattern: "package_rule.md",
          patternName: "package_rule",
          acquisition: { kind: "check", rootRoles: [], selections: [], rootPatterns },
        },
      },
    ],
    instance: {
      manifest: "habitat.toml",
      anchorRoot: "project",
      roots: [{ id: "project", required: true, kind: "directory" }],
      selections: [],
    },
  };
}

function project<const TypeSchema extends TSchema>(schema: TypeSchema) {
  return standard(schema)["~standard"].jsonSchema.input({ target: "draft-2020-12" });
}

function containsRefinement(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  if (Reflect.has(value, "~refine")) return true;
  return Object.values(value).some(containsRefinement);
}
