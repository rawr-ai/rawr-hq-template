import { ORPCError } from "@orpc/client";
import { ValidationError } from "@orpc/contract";
import { createRouterClient } from "@orpc/server";
import { type ServiceMetadataOf, schema } from "@rawr/hq-sdk";
import {
  createEmbeddedPlaceholderAnalyticsAdapter,
  type EmbeddedPlaceholderAnalyticsEntry,
} from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import {
  createEmbeddedPlaceholderLoggerAdapter,
  type EmbeddedPlaceholderLogEntry,
} from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import { Effect, Layer } from "effect";
import { eoc, implementEffect } from "effect-orpc";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";

import { awaitDependencyPromise, createServiceBaselineMiddlewares } from "../../src/service/base";

const EmptyInputSchema = Type.Object({}, { additionalProperties: false });
const AdmissionInputSchema = Type.Object(
  { value: Type.Integer() },
  { additionalProperties: false }
);
const AdmissionOutputSchema = Type.Object(
  { product: Type.Integer() },
  { additionalProperties: false }
);
const PublicationOutputSchema = Type.Object(
  { published: Type.Boolean() },
  { additionalProperties: false }
);

const admission = eoc.$meta<ServiceMetadataOf<{ audit: "basic"; entity: "service" }>>({
  idempotent: true,
  domain: "agent-plugin-lifecycle",
  audience: "internal",
  audit: "basic",
  entity: "service",
});

const contract = eoc.router({
  multiply: admission.input(schema(AdmissionInputSchema)).output(schema(AdmissionOutputSchema)),
  invalidOutput: admission.input(schema(EmptyInputSchema)).output(schema(AdmissionOutputSchema)),
  reject: admission.input(schema(EmptyInputSchema)).output(schema(AdmissionOutputSchema)),
  publish: admission.input(schema(EmptyInputSchema)).output(schema(PublicationOutputSchema)),
});

interface AdmissionContext {
  readonly multiplier: number;
  readonly rejectOperation: () => PromiseLike<never>;
  readonly publishOperation: () => PromiseLike<void>;
  readonly deps: {
    readonly analytics: ReturnType<typeof createEmbeddedPlaceholderAnalyticsAdapter>;
    readonly logger: ReturnType<typeof createEmbeddedPlaceholderLoggerAdapter>;
  };
}

const baseline = createServiceBaselineMiddlewares();
const impl = implementEffect(contract, Layer.empty)
  .$context<AdmissionContext>()
  .use(baseline.observability)
  .use(baseline.analytics);

const router = impl.router({
  multiply: impl.multiply.effect(function* ({ context, input }) {
    return yield* Effect.succeed({ product: context.multiplier * input.value });
  }),
  invalidOutput: impl.invalidOutput.effect(function* () {
    return yield* Effect.succeed({ product: Number.NaN });
  }),
  reject: impl.reject.effect(function* ({ context }) {
    return yield* awaitDependencyPromise(context.rejectOperation);
  }),
  publish: impl.publish.effect(function* ({ context }) {
    yield* awaitDependencyPromise(context.publishOperation);
    return { published: true };
  }),
});

function createAdmissionClient(
  options: {
    analyticsEntries?: EmbeddedPlaceholderAnalyticsEntry[];
    logEntries?: EmbeddedPlaceholderLogEntry[];
    rejectOperation?: () => PromiseLike<never>;
    publishOperation?: () => PromiseLike<void>;
  } = {}
) {
  return createRouterClient(router, {
    context: () => ({
      multiplier: 3,
      rejectOperation:
        options.rejectOperation ??
        (() => Promise.reject(new Error("Unexpected admission rejection procedure call"))),
      publishOperation: options.publishOperation ?? (() => Promise.resolve()),
      deps: {
        analytics: createEmbeddedPlaceholderAnalyticsAdapter({
          sink: options.analyticsEntries,
        }),
        logger: createEmbeddedPlaceholderLoggerAdapter({ sink: options.logEntries }),
      },
    }),
  });
}

describe("effect-orpc Effect 4 admission", () => {
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

  it("preserves a local dependency cause and emits one baseline error record", async () => {
    const dependencyCause = new Error("Admission dependency failed");
    const analyticsEntries: EmbeddedPlaceholderAnalyticsEntry[] = [];
    const logEntries: EmbeddedPlaceholderLogEntry[] = [];
    const client = createAdmissionClient({
      analyticsEntries,
      logEntries,
      rejectOperation: () => Promise.reject(dependencyCause),
    });

    const error = await client.reject({}).then(
      () => undefined,
      (cause: unknown) => cause
    );

    expect(error).toBeInstanceOf(ORPCError);
    if (!(error instanceof ORPCError)) {
      throw new Error("Expected the local Effect bridge to return an ORPCError");
    }
    expect(error).toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    expect(error.cause).toBe(dependencyCause);
    expect(
      analyticsEntries.filter(
        (entry) =>
          entry.event === "orpc.procedure" &&
          entry.payload.path === "reject" &&
          entry.payload.outcome === "error"
      )
    ).toHaveLength(1);
    expect(
      logEntries.filter(
        (entry) =>
          entry.event === "orpc.procedure" &&
          entry.level === "error" &&
          entry.payload.path === "reject" &&
          entry.payload.outcome === "error"
      )
    ).toHaveLength(1);
  });

  it("settles an uncancellable dependency mutation before observing request cancellation", async () => {
    const started = Promise.withResolvers<void>();
    const finish = Promise.withResolvers<void>();
    let mutationSettled = false;
    const client = createAdmissionClient({
      publishOperation: async () => {
        started.resolve();
        await finish.promise;
        mutationSettled = true;
      },
    });
    const controller = new AbortController();
    const publication = client.publish({}, { signal: controller.signal });

    await started.promise;
    controller.abort(new Error("Admission request cancelled"));
    const stateBeforeSettlement = await Promise.race([
      publication.then(
        () => "settled" as const,
        () => "settled" as const
      ),
      new Promise<"pending">((resolve) => setTimeout(() => resolve("pending"), 20)),
    ]);

    try {
      expect(stateBeforeSettlement).toBe("pending");
      expect(mutationSettled).toBe(false);
    } finally {
      finish.resolve();
      await publication.catch(() => undefined);
    }
    await expect(publication).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    expect(mutationSettled).toBe(true);
  });
});
