import { standard } from "@habitat-ai/typebox-adapter";
import { type TSchema, Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";

import * as dto from "../../../src/service/model/dto";
import {
  EmptyReadonlyArray,
  NonEmptyReadonlyArray,
} from "../../../src/service/model/dto/structural";

describe("service model schema publication", () => {
  it("projects every exported DTO schema to draft 2020-12 without runtime-only metadata", () => {
    const schemaExports = Object.entries(dto).filter(([name]) => name.endsWith("Schema"));

    expect(schemaExports.length).toBeGreaterThan(0);
    for (const [name, schema] of schemaExports) {
      expect(isTypeBoxSchema(schema), `${name} is a TypeBox schema`).toBe(true);
      if (!isTypeBoxSchema(schema)) continue;
      expect(containsRuntimeOnlyMetadata(schema), name).toBe(false);

      const projected = standard(schema)["~standard"].jsonSchema.input({
        target: "draft-2020-12",
      });
      expect(containsRuntimeOnlyMetadata(projected), `${name} projection`).toBe(false);
      expect(() => JSON.parse(JSON.stringify(projected)), `${name} JSON round trip`).not.toThrow();
    }
  });

  it("publishes native array cardinality while preserving runtime admission", () => {
    const empty = EmptyReadonlyArray(Type.String());
    const nonEmpty = NonEmptyReadonlyArray(Type.String(), { maxItems: 2 });

    expect(Value.Check(empty, [])).toBe(true);
    expect(Value.Check(empty, ["one"])).toBe(false);
    expect(Value.Check(nonEmpty, [])).toBe(false);
    expect(Value.Check(nonEmpty, ["one"])).toBe(true);
    expect(Value.Check(nonEmpty, ["one", "two", "three"])).toBe(false);

    expect(project(empty)).toMatchObject({ type: "array", maxItems: 0 });
    expect(project(nonEmpty)).toMatchObject({ type: "array", minItems: 1, maxItems: 2 });
  });

  it("recognizes codec metadata across adapter projection", () => {
    const codec = Type.Codec(Type.String())
      .Decode((value) => value.length)
      .Encode((value) => String(value));

    expect(containsRuntimeOnlyMetadata(codec)).toBe(true);
    expect(containsRuntimeOnlyMetadata(project(codec))).toBe(true);
  });

  it("does not pretend runtime byte containers are JSON DTO schemas", () => {
    expect(dto).not.toHaveProperty("Uint8ArraySchema");
    expect(dto).not.toHaveProperty("ExactGitBlobObservationSchema");
  });
});

function project<const TypeSchema extends TSchema>(schema: TypeSchema) {
  return standard(schema)["~standard"].jsonSchema.input({ target: "draft-2020-12" });
}

function isTypeBoxSchema(value: unknown): value is TSchema {
  return value !== null && typeof value === "object" && Reflect.has(value, "~kind");
}

function containsRuntimeOnlyMetadata(value: unknown, seen = new WeakSet<object>()): boolean {
  if (value === null || typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  if (
    Reflect.has(value, "~codec") ||
    Reflect.has(value, "~refine") ||
    Reflect.has(value, "~unsafe")
  ) {
    return true;
  }
  return Reflect.ownKeys(value).some((key) =>
    containsRuntimeOnlyMetadata(Reflect.get(value, key), seen)
  );
}
