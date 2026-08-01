import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, test } from "vitest";

import {
  canonicalLedgerId,
  loadInquiryDefinition,
  validateInquiryDefinition,
} from "../../definition";
import { configGraphIri } from "../../namespaces";
import { definitionFixture } from "./fixture";

const MATERIALIZATION_PATH = "tools/temporal-inquiry/model/materialize.sparql";

function rawDefinition(): unknown {
  return {
    ...definitionFixture,
    ledger: "example/history",
  };
}

describe("inquiry definition", () => {
  test("validates the explicit v1 opt-in and canonicalizes the main branch", () => {
    const definition = validateInquiryDefinition(rawDefinition());

    expect(definition.schemaVersion).toBe(1);
    expect(definition.ledger).toBe("example/history:main");
    expect(canonicalLedgerId("example/history")).toBe("example/history:main");
    expect(configGraphIri("example/history")).toBe("urn:fluree:example/history:main#config");
  });

  test("rejects unknown fields, remote endpoints, and escaping paths", () => {
    expect(() =>
      validateInquiryDefinition({
        ...definitionFixture,
        output: ".fluree/result",
      })
    ).toThrow(/unknown field/u);
    expect(() =>
      validateInquiryDefinition({
        ...definitionFixture,
        runtime: {
          version: "4.1.4",
          endpoint: "https://database.example.test",
        },
      })
    ).toThrow(/local external Fluree/u);
    expect(() =>
      validateInquiryDefinition({
        ...definitionFixture,
        frame: { path: "../post-it.md" },
      })
    ).toThrow(/must not escape/u);
  });

  test("rejects non-native model formats", () => {
    expect(() =>
      validateInquiryDefinition({
        ...definitionFixture,
        model: {
          ...definitionFixture.model,
          rules: "model/rules.json",
        },
      })
    ).toThrow(/native \.trig format/u);
  });

  test("accepts only a native SPARQL semantic materialization definition", () => {
    expect(
      validateInquiryDefinition({
        ...definitionFixture,
        model: {
          ...definitionFixture.model,
          materialization: MATERIALIZATION_PATH,
        },
      }).model.materialization
    ).toBe(MATERIALIZATION_PATH);
    expect(() =>
      validateInquiryDefinition({
        ...definitionFixture,
        model: {
          ...definitionFixture.model,
          materialization: "tools/temporal-inquiry/model/materialize.rq",
        },
      })
    ).toThrow(/model\.materialization: must use the native \.sparql format/u);
  });

  test("accepts only full lower-case Git object IDs as explicit pins", () => {
    expect(
      validateInquiryDefinition({
        ...definitionFixture,
        repository: {
          ...definitionFixture.repository,
          pins: ["0123456789abcdef0123456789abcdef01234567", "a".repeat(64)],
        },
      }).repository.pins
    ).toEqual(["0123456789abcdef0123456789abcdef01234567", "a".repeat(64)]);
    expect(() =>
      validateInquiryDefinition({
        ...definitionFixture,
        repository: {
          ...definitionFixture.repository,
          pins: ["0123456789abcdef0123456789abcdef0123456A"],
        },
      })
    ).toThrow(/full lower-case Git object ID/u);
    expect(() =>
      validateInquiryDefinition({
        ...definitionFixture,
        repository: {
          ...definitionFixture.repository,
          pins: ["01234567"],
        },
      })
    ).toThrow(/full lower-case Git object ID/u);
  });

  test("loads a declared materialization only while its authored input exists", async () => {
    const root = await mkdtemp(join(tmpdir(), "inquiry-definition-"));
    const definitionPath = "tools/temporal-inquiry/habitat-inquiry.json";
    try {
      const definition = {
        ...definitionFixture,
        ledger: "example/history",
        model: {
          ...definitionFixture.model,
          materialization: MATERIALIZATION_PATH,
        },
      };
      const paths = [
        definitionFixture.repository.definition,
        definitionFixture.model.ontology,
        definitionFixture.model.rules,
        definitionFixture.model.shapes,
        definitionFixture.model.config,
        ...definitionFixture.model.facts,
        MATERIALIZATION_PATH,
        definitionFixture.adapters.projection,
        definitionFixture.adapters.session,
        definitionFixture.frame.path,
        definitionPath,
      ].filter((path): path is string => path !== undefined);
      for (const path of paths) {
        await mkdir(dirname(resolve(root, path)), { recursive: true });
        await writeFile(
          resolve(root, path),
          path === definitionPath ? `${JSON.stringify(definition)}\n` : "{}\n"
        );
      }
      await mkdir(resolve(root, definitionFixture.adapters.queries), {
        recursive: true,
      });

      const loaded = await loadInquiryDefinition(root, definitionPath);
      expect(loaded.ledger).toBe("example/history:main");
      expect(loaded.model.materialization).toBe(MATERIALIZATION_PATH);

      await rm(resolve(root, MATERIALIZATION_PATH));
      await expect(loadInquiryDefinition(root, definitionPath)).rejects.toThrow(
        /materialize\.sparql: declared input is unavailable/u
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
