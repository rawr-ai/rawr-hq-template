import { describe, expect, test } from "bun:test";
import { standard } from "@habitat-ai/typebox-adapter";
import type { TSchema } from "typebox";
import { Value } from "typebox/value";
import {
  CompatibilityBaselineSchema,
  CompatibilityRuleSourceSchema,
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

function project<const TypeSchema extends TSchema>(schema: TypeSchema) {
  return standard(schema)["~standard"].jsonSchema.input({ target: "draft-2020-12" });
}

function containsRefinement(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  if (Reflect.has(value, "~refine")) return true;
  return Object.values(value).some(containsRefinement);
}
