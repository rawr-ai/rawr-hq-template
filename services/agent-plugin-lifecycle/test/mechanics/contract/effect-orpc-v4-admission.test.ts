import "@orpc/experimental-effect/extensions/effect";
import { procedureMetadata } from "@habitat-ai/rawr-hq-sdk";
import { standard } from "@habitat-ai/typebox-adapter";
import { ORPCError } from "@orpc/client";
import { oc, ValidationError } from "@orpc/contract";
import { createRouterClient, implement } from "@orpc/server";
import { Effect } from "effect";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";

const EmptyInputSchema = Type.Object({}, { additionalProperties: false });
const AdmissionInputSchema = Type.Object(
  { value: Type.Integer() },
  { additionalProperties: false }
);
const AdmissionOutputSchema = Type.Object(
  { product: Type.Integer() },
  { additionalProperties: false }
);

const admission = oc.meta(
  procedureMetadata({
    idempotent: true,
    domain: "agent-plugin-lifecycle",
    audience: "internal",
    audit: "basic",
    entity: "service",
  })
);

const contract = oc.router({
  multiply: admission.input(standard(AdmissionInputSchema)).output(standard(AdmissionOutputSchema)),
  invalidOutput: admission
    .input(standard(EmptyInputSchema))
    .output(standard(AdmissionOutputSchema)),
});

interface AdmissionContext {
  readonly multiplier: number;
}

const impl = implement(contract).$context<AdmissionContext>();

const router = impl.router({
  multiply: impl.multiply.effect(function* ({ context, input }) {
    return yield* Effect.succeed({ product: context.multiplier * input.value });
  }),
  invalidOutput: impl.invalidOutput.effect(function* () {
    return yield* Effect.succeed({ product: Number.NaN });
  }),
});

function createAdmissionClient() {
  return createRouterClient(router, {
    context: () => ({
      multiplier: 3,
    }),
  });
}

describe("official Effect-oRPC admission", () => {
  it("preserves TypeBox input and output validation around an Effect handler", async () => {
    const client = createAdmissionClient();
    const invalidInput = { value: 7, unexpected: true };

    await expect(client.multiply({ value: 7 })).resolves.toEqual({ product: 21 });
    await expect(client.multiply(invalidInput)).rejects.toBeDefined();
    const invalidOutputError = await client.invalidOutput({}).then(
      () => undefined,
      (cause: unknown) => cause
    );

    expect(invalidOutputError).toBeInstanceOf(ORPCError);
    if (!(invalidOutputError instanceof ORPCError)) {
      throw new Error("Expected TypeBox output validation to return an ORPCError");
    }
    expect(invalidOutputError).toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "Output validation failed",
    });
    expect(invalidOutputError.cause).toBeInstanceOf(ValidationError);
  });
});
