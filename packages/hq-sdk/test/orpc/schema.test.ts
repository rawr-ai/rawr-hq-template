import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";

import { schema, typeBoxStandardSchema } from "../../src/orpc/schema";

describe("TypeBox Standard Schema bridge", () => {
  it("returns validated values through the canonical adapter", async () => {
    const value = { name: "cognition", enabled: true };
    const result = await schema(
      Type.Object({
        name: Type.String(),
        enabled: Type.Boolean(),
      })
    )["~standard"].validate(value);

    expect(result).toEqual({ value });
  });

  it("returns TypeBox validation messages without inventing issue paths", async () => {
    const typeboxSchema = Type.Object({
      profile: Type.Object({ name: Type.String() }),
      tags: Type.Array(Type.String()),
    });
    const value = {
      profile: { name: 7 },
      tags: ["stable", 8],
    };
    const expected = Value.Errors(typeboxSchema, value).map(({ message }) => ({ message }));

    const result = await typeBoxStandardSchema(typeboxSchema)["~standard"].validate(value);
    expect(result).toEqual({ issues: expected });
  });
});
