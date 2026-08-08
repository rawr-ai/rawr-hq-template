import { describe, expect, test } from "bun:test";
import { Type } from "typebox";
import { standard } from "../src";

describe("TypeBox Standard Schema adapter", () => {
  test("validates and projects one detached construction snapshot", () => {
    const source = Type.Object(
      {
        label: Type.String({ minLength: 2 }),
      },
      { additionalProperties: false }
    );
    const schema = standard(source);

    Object.assign(source.properties.label, { minLength: 20 });

    expect(schema["~standard"].validate({ label: "ok" })).toEqual({
      value: { label: "ok" },
    });
    expect(schema["~standard"].validate({ label: "x" })).toHaveProperty("issues");

    const first = schema["~standard"].jsonSchema.input({
      target: "draft-2020-12",
    });
    first.properties = {};

    expect(
      schema["~standard"].jsonSchema.output({
        target: "draft-2020-12",
      })
    ).toMatchObject({
      type: "object",
      properties: {
        label: { type: "string", minLength: 2 },
      },
      additionalProperties: false,
    });
  });

  test("emits message-only issues for ambiguous TypeBox instance paths", () => {
    const schema = standard(
      Type.Object(
        {
          "%": Type.String({ minLength: 1 }),
          "%2F": Type.String({ minLength: 1 }),
          "a/b": Type.String({ minLength: 1 }),
          "~": Type.String({ minLength: 1 }),
          "0": Type.String({ minLength: 1 }),
          a: Type.Object({
            b: Type.String({ minLength: 1 }),
          }),
          items: Type.Array(Type.String({ minLength: 1 })),
        },
        { additionalProperties: false }
      )
    );

    const result = schema["~standard"].validate({
      "%": "",
      "%2F": "",
      "a/b": "",
      "~": "",
      "0": "",
      a: { b: "" },
      items: [""],
    });
    if (!("issues" in result) || !result.issues) {
      throw new Error("Expected TypeBox validation issues");
    }

    expect(result.issues).toHaveLength(7);
    expect(result.issues.every((issue) => issue.message.length > 0)).toBe(true);
    expect(result.issues.every((issue) => !("path" in issue))).toBe(true);
  });

  test("does not claim a numeric object key is distinguishable from an array index", () => {
    const objectSchema = standard(
      Type.Object({
        "0": Type.Number(),
      })
    );
    const arraySchema = standard(Type.Array(Type.Number()));

    for (const result of [
      objectSchema["~standard"].validate({ "0": "invalid" }),
      arraySchema["~standard"].validate(["invalid"]),
    ]) {
      if (!("issues" in result) || !result.issues) {
        throw new Error("Expected TypeBox validation issues");
      }
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).not.toHaveProperty("path");
    }
  });

  test("refuses JSON Schema targets TypeBox does not project", () => {
    const schema = standard(Type.String());

    expect(() => schema["~standard"].jsonSchema.input({ target: "draft-07" })).toThrow(
      "Unsupported JSON Schema target: draft-07"
    );
  });

  test("publishes only the native adapter surface", async () => {
    const adapter = await import("../src");

    expect(Object.keys(adapter)).toEqual(["standard"]);
    expect(standard(Type.String())).not.toHaveProperty("__typebox");
  });
});
