import {
  type BeginNativeOperationInput,
  type FinishNativeOperationInput,
  type NativeOperationTelemetryScope,
  type TelemetryAvailability,
  type TelemetryResource,
} from "@habitat-ai/resource-telemetry";
import { Effect } from "effect";
import { headerKeys, Inngest, InngestMiddleware, NonRetriableError } from "inngest";
import { serve } from "inngest/bun";
import { afterEach, describe, expect, it, vi } from "vitest";

import { observeInngestAttempts, requireNativeInngestFunctions } from "../src/inngest-telemetry";

type FinishedAttempt = Readonly<{
  begin: BeginNativeOperationInput;
  finish: FinishNativeOperationInput;
}>;

const PROCESS_IDENTITY = Object.freeze({
  serviceName: "rawr-inngest-telemetry-test",
  deploymentEnvironment: "test",
  processRole: "server-test",
  processInstanceId: "server-test-1",
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeTelemetry(options?: {
  availability?: TelemetryAvailability;
  beginDefect?: unknown;
  finishDefect?: unknown;
  onBegin?: (input: BeginNativeOperationInput) => void;
}): Readonly<{
  telemetry: TelemetryResource;
  begins: BeginNativeOperationInput[];
  finished: FinishedAttempt[];
}> {
  const begins: BeginNativeOperationInput[] = [];
  const finished: FinishedAttempt[] = [];
  const telemetry: TelemetryResource = {
    processIdentity: PROCESS_IDENTITY,
    availability: options?.availability ?? "available",
    beginNativeOperation: (begin) => {
      begins.push(begin);
      options?.onBegin?.(begin);
      if (options?.beginDefect !== undefined) return Effect.die(options.beginDefect);

      const scope: NativeOperationTelemetryScope = {
        enrich: () => Effect.void,
        finish: (finish) =>
          options?.finishDefect === undefined
            ? Effect.sync(() => {
                finished.push({ begin, finish });
              })
            : Effect.die(options.finishDefect),
      };
      return Effect.succeed(scope);
    },
    emitTechnicalLog: () => Effect.void,
    readDiagnostics: () => Effect.succeed(Object.freeze([])),
    flush: () =>
      Effect.succeed(
        Object.freeze({
          outcome: "flushed" as const,
          diagnostics: Object.freeze([]),
        })
      ),
  };

  return { telemetry, begins, finished };
}

function quietLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
}

function executionRequest(input: {
  functionId: string;
  runId?: string;
  attempt?: number;
  eventName?: string;
  steps?: Readonly<Record<string, unknown>>;
  probe?: string;
  stepId?: string;
  stepHeader?: string;
  method?: string;
  rawBody?: string;
}): Request {
  const runId = input.runId ?? "run-native-attempt";
  const eventName = input.eventName ?? "telemetry/native.execute";
  const event = {
    id: `event-${runId}`,
    name: eventName,
    data: {},
    ts: Date.now(),
  };
  const url = new URL("http://telemetry.test/api/inngest");
  url.searchParams.set("fnId", input.functionId);
  if (input.probe !== undefined) url.searchParams.set("probe", input.probe);
  if (input.stepId !== undefined) url.searchParams.set("stepId", input.stepId);

  const headers = new Headers({
    "content-type": "application/json",
    host: "telemetry.test",
  });
  if (input.stepHeader !== undefined) headers.set("x-inngest-step-id", input.stepHeader);

  return new Request(url, {
    method: input.method ?? "POST",
    headers,
    body:
      (input.method ?? "POST") === "GET"
        ? undefined
        : (input.rawBody ??
          JSON.stringify({
            event,
            events: [event],
            steps: input.steps ?? {},
            version: 1,
            ctx: {
              run_id: runId,
              ...(input.attempt === undefined ? {} : { attempt: input.attempt }),
              max_attempts: 2,
              disable_immediate_execution: false,
              use_api: false,
              stack: { stack: [], current: 0 },
            },
          })),
  });
}

function fixtureFunction(
  client: Inngest,
  options?: {
    onFailure?: () => Promise<unknown>;
    handler?: () => unknown;
  }
) {
  return client.createFunction(
    {
      id: "observed",
      ...(options?.onFailure === undefined ? {} : { onFailure: options.onFailure }),
    },
    { event: "telemetry/native.execute" },
    options?.handler ?? (() => ({ ok: true }))
  );
}

function observedHandler(input: {
  client: Inngest;
  telemetry: TelemetryResource;
  handler: (request: Request) => Promise<Response>;
  withFailureHandler?: boolean;
}) {
  const fn = fixtureFunction(
    input.client,
    input.withFailureHandler ? { onFailure: async () => ({ recovered: true }) } : undefined
  );
  return {
    fn,
    handler: observeInngestAttempts({
      client: input.client,
      functions: [fn],
      handler: input.handler,
      telemetry: input.telemetry,
    }),
  };
}

function plannedStep(responseBody: unknown): Readonly<{ id: string; data: unknown }> {
  if (!Array.isArray(responseBody) || responseBody.length !== 1) {
    throw new Error("expected one planned Inngest step");
  }
  const step = responseBody[0];
  if (typeof step !== "object" || step === null) throw new Error("invalid planned Inngest step");
  const id = Reflect.get(step, "id");
  if (typeof id !== "string") throw new Error("planned Inngest step has no id");
  return { id, data: Reflect.get(step, "data") };
}

describe.sequential("Inngest attempt telemetry", () => {
  it("returns the exact native handler when telemetry is disabled", () => {
    const { telemetry } = makeTelemetry({ availability: "disabled" });
    const client = new Inngest({ id: "disabled-attempts", isDev: true });
    const fn = fixtureFunction(client);
    const nativeHandler = vi.fn(async () => new Response("native"));

    expect(
      observeInngestAttempts({ client, functions: [fn], handler: nativeHandler, telemetry })
    ).toBe(nativeHandler);
  });

  it("preserves exact real Serve responses for native success and failure classes", async () => {
    const { telemetry, begins, finished } = makeTelemetry();
    const client = new Inngest({ id: "native-outcomes", isDev: true, logger: quietLogger() });
    let selected: "succeeded" | "declared" | "failed" = "succeeded";
    const fn = client.createFunction(
      { id: "outcomes" },
      { event: "telemetry/native.execute" },
      () => {
        if (selected === "declared") throw new NonRetriableError("declared failure");
        if (selected === "failed") throw new Error("retryable failure");
        return { ok: true };
      }
    );
    const nativeServe = serve({ client, functions: [fn], logLevel: "silent", streaming: false });
    let exactNativeResponse: Response | undefined;
    const nativeHandler = async (request: Request) => {
      exactNativeResponse = await nativeServe(request);
      return exactNativeResponse;
    };
    const handler = observeInngestAttempts({
      client,
      functions: [fn],
      handler: nativeHandler,
      telemetry,
    });
    const statuses: number[] = [];
    const retryPolicies: Array<string | null> = [];

    for (const [attempt, outcome] of ["succeeded", "declared", "failed"].entries()) {
      selected = outcome as typeof selected;
      const response = await handler(
        executionRequest({ functionId: fn.id(client.id), runId: `run-${outcome}`, attempt })
      );
      expect(response).toBe(exactNativeResponse);
      statuses.push(response.status);
      retryPolicies.push(response.headers.get(headerKeys.NoRetry));
    }

    expect(statuses).toEqual([200, 400, 500]);
    expect(retryPolicies).toEqual([null, "true", "false"]);
    expect(begins).toHaveLength(3);
    expect(finished.map(({ finish }) => finish.outcome)).toEqual(["succeeded", "failed", "failed"]);
    expect(finished.map(({ finish }) => finish.attributes["http.response.status_code"])).toEqual(
      statuses
    );
  });

  it("classifies only native terminal response statuses", async () => {
    const { telemetry, begins, finished } = makeTelemetry();
    const client = new Inngest({ id: "terminal-status", isDev: true });
    const statuses = [206, 201, 200, 400, 500, 401, 403, 405] as const;
    let call = 0;
    const { fn, handler } = observedHandler({
      client,
      telemetry,
      handler: async (request) => {
        expect(await request.json()).toBeDefined();
        const status = statuses[call++];
        return new Response(null, {
          status,
          headers:
            status === 400 || status === 500
              ? { [headerKeys.NoRetry]: status === 400 ? "true" : "false" }
              : undefined,
        });
      },
    });

    for (const attempt of statuses.keys()) {
      await handler(
        executionRequest({ functionId: fn.id(client.id), runId: `run-${attempt}`, attempt })
      );
    }

    expect(begins).toHaveLength(3);
    expect(finished.map(({ finish }) => finish.outcome)).toEqual(["succeeded", "failed", "failed"]);
  });

  it("uses the native run, requested step, and attempt tuple as identity", async () => {
    const { telemetry, finished } = makeTelemetry();
    const client = new Inngest({ id: "attempt-identity", isDev: true });
    const { fn, handler } = observedHandler({
      client,
      telemetry,
      handler: async () => new Response(null, { status: 200 }),
    });
    const functionId = fn.id(client.id);
    const common = { functionId, runId: "run-retry", attempt: 0 } as const;

    await handler(executionRequest({ ...common, stepId: "step-a" }));
    await handler(executionRequest({ ...common, stepId: "step-a" }));
    await handler(executionRequest({ ...common, stepId: "step-b" }));
    await handler(executionRequest({ ...common, stepHeader: "step-c" }));
    await handler(executionRequest({ ...common, stepId: "step-a", stepHeader: "ignored-header" }));

    const ids = finished.map(({ begin }) => begin.operationId);
    expect(ids[0]).toBe(ids[1]);
    expect(ids[0]).toBe(ids[4]);
    expect(new Set([ids[0], ids[2], ids[3]])).toHaveLength(3);
    expect(finished.map(({ begin }) => begin.attributes["inngest.run.id"])).toEqual(
      Array.from({ length: 5 }, () => "run-retry")
    );
    expect(finished.map(({ begin }) => begin.attributes["inngest.step.id"])).toEqual([
      "step-a",
      "step-a",
      "step-b",
      "step-c",
      "step-a",
    ]);
  });

  it("uses native attempt zero when omitted and admits the installed numeric domain", async () => {
    const { telemetry, finished } = makeTelemetry();
    const client = new Inngest({ id: "attempt-domain", isDev: true });
    const { fn, handler } = observedHandler({
      client,
      telemetry,
      handler: async () => new Response(null, { status: 200 }),
    });
    const functionId = fn.id(client.id);

    await handler(executionRequest({ functionId, runId: "run-number" }));
    await handler(executionRequest({ functionId, runId: "run-number", attempt: 0 }));
    await handler(executionRequest({ functionId, runId: "run-number", attempt: 1.5 }));

    const ids = finished.map(({ begin }) => begin.operationId);
    expect(ids[0]).toBe(ids[1]);
    expect(ids[2]).not.toBe(ids[1]);
  });

  it("mirrors native truthy probe admission", async () => {
    const { telemetry, begins, finished } = makeTelemetry();
    const client = new Inngest({ id: "native-probe", isDev: true, logger: quietLogger() });
    const fn = fixtureFunction(client);
    const handler = observeInngestAttempts({
      client,
      functions: [fn],
      handler: serve({ client, functions: [fn], logLevel: "silent", streaming: false }),
      telemetry,
    });
    const functionId = fn.id(client.id);

    expect((await handler(executionRequest({ functionId, probe: "trust" }))).status).toBe(200);
    expect(begins).toHaveLength(0);
    expect((await handler(executionRequest({ functionId, probe: "" }))).status).toBe(200);
    expect(begins).toHaveLength(1);
    expect(finished[0]?.finish.outcome).toBe("succeeded");
  });

  it("admits configured failure-function identity without changing registration", async () => {
    const { telemetry, finished } = makeTelemetry();
    const client = new Inngest({ id: "failure-function", isDev: true });
    const { fn, handler } = observedHandler({
      client,
      telemetry,
      withFailureHandler: true,
      handler: async () => new Response(null, { status: 200 }),
    });
    const failureFunctionId = `${fn.id(client.id)}-failure`;

    await handler(executionRequest({ functionId: failureFunctionId }));

    expect(finished[0]?.begin.attributes["inngest.function.id"]).toBe(failureFunctionId);
    expect(fn.opts.onFailure).toBeDefined();
  });

  it("passes non-execution requests through without opening telemetry scopes", async () => {
    const { telemetry, begins, finished } = makeTelemetry();
    const client = new Inngest({ id: "admission", isDev: true });
    const nativeHandler = vi.fn(async (_request: Request) => new Response(null, { status: 200 }));
    const { fn, handler } = observedHandler({ client, telemetry, handler: nativeHandler });
    const functionId = fn.id(client.id);
    const requests = [
      executionRequest({ functionId, probe: "trust" }),
      executionRequest({ functionId: "admission-unknown" }),
      executionRequest({ functionId, method: "GET" }),
      executionRequest({ functionId, rawBody: "not-json" }),
    ];

    for (const request of requests) await handler(request);

    expect(nativeHandler.mock.calls.map(([request]) => request)).toEqual(requests);
    expect(begins).toHaveLength(0);
    expect(finished).toHaveLength(0);
  });

  it("does not classify a native pre-execution envelope rejection as an attempt", async () => {
    const { telemetry, begins, finished } = makeTelemetry();
    const client = new Inngest({ id: "native-envelope", isDev: true, logger: quietLogger() });
    const userHandler = vi.fn(() => ({ ok: true }));
    const fn = fixtureFunction(client, { handler: userHandler });
    const handler = observeInngestAttempts({
      client,
      functions: [fn],
      handler: serve({ client, functions: [fn], logLevel: "silent", streaming: false }),
      telemetry,
    });

    const response = await handler(
      executionRequest({
        functionId: fn.id(client.id),
        rawBody: JSON.stringify({ version: 1, ctx: { run_id: "run-never-admitted" } }),
      })
    );

    expect(response.status).toBe(500);
    expect(response.headers.has(headerKeys.NoRetry)).toBe(false);
    expect(userHandler).not.toHaveBeenCalled();
    expect(begins).toHaveLength(0);
    expect(finished).toHaveLength(0);
  });

  it("does not observe an unsigned cloud request rejected by native Serve", async () => {
    const { telemetry, begins, finished } = makeTelemetry();
    const client = new Inngest({ id: "native-auth", isDev: false, logger: quietLogger() });
    const fn = fixtureFunction(client);
    const handler = observeInngestAttempts({
      client,
      functions: [fn],
      handler: serve({
        client,
        functions: [fn],
        logLevel: "silent",
        signingKey: "signkey-test-00000000000000000000000000000000",
        streaming: false,
      }),
      telemetry,
    });

    expect((await handler(executionRequest({ functionId: fn.id(client.id) }))).status).toBe(401);
    expect(begins).toHaveLength(0);
    expect(finished).toHaveLength(0);
  });

  it("falls through clone failure without replacing the native request or response", async () => {
    const { telemetry, begins, finished } = makeTelemetry();
    const client = new Inngest({ id: "clone-failure", isDev: true });
    const response = new Response("native", { status: 200 });
    const nativeHandler = vi.fn(async () => response);
    const { fn, handler } = observedHandler({ client, telemetry, handler: nativeHandler });
    const request = executionRequest({ functionId: fn.id(client.id) });
    Object.defineProperty(request, "clone", {
      value() {
        throw new Error("clone unavailable");
      },
    });

    expect(await handler(request)).toBe(response);
    expect(nativeHandler).toHaveBeenCalledWith(request);
    expect(begins).toHaveLength(0);
    expect(finished).toHaveLength(0);
  });

  it("contains observation defects and preserves the exact native result", async () => {
    const cases = [
      ["begin", makeTelemetry({ beginDefect: new Error("begin defect") }).telemetry],
      ["finish", makeTelemetry({ finishDefect: new Error("finish defect") }).telemetry],
    ] as const;

    for (const [id, telemetry] of cases) {
      const response = new Response(`native-${id}`, { status: 200 });
      const client = new Inngest({ id: `defect-${id}`, isDev: true });
      const { fn, handler } = observedHandler({
        client,
        telemetry,
        handler: async () => response,
      });
      expect(await handler(executionRequest({ functionId: fn.id(client.id) }))).toBe(response);
    }
  });

  it("passes through an escaped native error without classifying an attempt", async () => {
    const { telemetry, begins, finished } = makeTelemetry();
    const client = new Inngest({ id: "exact-error", isDev: true });
    const nativeError = Object.freeze({ reason: "native thrown object" });
    const { fn, handler } = observedHandler({
      client,
      telemetry,
      handler: async () => {
        throw nativeError;
      },
    });

    await expect(handler(executionRequest({ functionId: fn.id(client.id) }))).rejects.toBe(
      nativeError
    );
    expect(begins).toHaveLength(0);
    expect(finished).toHaveLength(0);
  });

  it("bounds native identities and emits only admitted attempt attributes", async () => {
    const { telemetry, finished } = makeTelemetry();
    const client = new Inngest({ id: `client-${"c".repeat(300)}`, isDev: true });
    const { fn, handler } = observedHandler({
      client,
      telemetry,
      handler: async () => new Response(null, { status: 200 }),
    });

    await handler(
      executionRequest({
        functionId: fn.id(client.id),
        runId: `run-${"r".repeat(300)}`,
        stepId: `step-${"s".repeat(300)}`,
        attempt: 7,
      })
    );

    const attempt = finished[0];
    expect(attempt?.begin.operationId.length).toBeLessThanOrEqual(256);
    expect(Object.keys(attempt?.begin.attributes ?? {}).sort()).toEqual([
      "inngest.attempt.id",
      "inngest.function.id",
      "inngest.run.id",
      "inngest.step.id",
    ]);
    expect(Object.keys(attempt?.finish.attributes ?? {}).sort()).toEqual([
      "duration.ms",
      "http.response.status_code",
    ]);
  });

  it("observes native step planning only after the final Serve response", async () => {
    const { telemetry, begins, finished } = makeTelemetry();
    const client = new Inngest({ id: "native-step", isDev: true, logger: quietLogger() });
    const eventName = "telemetry/native.step";
    const fn = client.createFunction({ id: "planned" }, { event: eventName }, async ({ step }) => {
      const result = await step.run("native-step", () => ({ admitted: true }));
      return { completed: result.admitted };
    });
    const handler = observeInngestAttempts({
      client,
      functions: [fn],
      handler: serve({ client, functions: [fn], logLevel: "silent", streaming: false }),
      telemetry,
    });
    const functionId = fn.id(client.id);
    const runId = "run-step-terminal";

    const planningResponse = await handler(
      executionRequest({ functionId, eventName, runId, attempt: 0 })
    );
    expect(planningResponse.status).toBe(206);
    const step = plannedStep(await planningResponse.json());
    expect(begins).toHaveLength(0);
    expect(finished).toHaveLength(0);

    const terminalResponse = await handler(
      executionRequest({
        functionId,
        eventName,
        runId,
        attempt: 0,
        stepId: step.id,
        steps: { [step.id]: { type: "data", data: step.data } },
      })
    );
    expect(terminalResponse.status).toBe(200);
    expect(begins).toHaveLength(1);
    expect(finished[0]?.finish.outcome).toBe("succeeded");
  });

  it("uses the final native response after input and output middleware", async () => {
    const inputFailure = new InngestMiddleware({
      name: "input failure",
      init: () => ({
        onFunctionRun: () => ({
          transformInput: () => {
            throw new Error("input middleware failed");
          },
        }),
      }),
    });
    const outputFailure = new InngestMiddleware({
      name: "output failure",
      init: () => ({
        onFunctionRun: () => ({
          transformOutput: () => ({ result: { error: new Error("output middleware failed") } }),
        }),
      }),
    });

    for (const [id, middleware, expectedCalls] of [
      ["input", inputFailure, 0],
      ["output", outputFailure, 1],
    ] as const) {
      const { telemetry, begins, finished } = makeTelemetry();
      const client = new Inngest({
        id: `middleware-${id}`,
        isDev: true,
        middleware: [middleware],
        logger: quietLogger(),
      });
      const userHandler = vi.fn(() => ({ ok: true }));
      const fn = fixtureFunction(client, { handler: userHandler });
      const handler = observeInngestAttempts({
        client,
        functions: [fn],
        handler: serve({ client, functions: [fn], logLevel: "silent", streaming: false }),
        telemetry,
      });

      expect((await handler(executionRequest({ functionId: fn.id(client.id) }))).status).toBe(500);
      expect(userHandler).toHaveBeenCalledTimes(expectedCalls);
      expect(begins).toHaveLength(1);
      expect(finished[0]?.finish.outcome).toBe("failed");
    }
  });
});

describe("Inngest Serve admission", () => {
  it("requires native function objects and contains the vendor guard's null case", () => {
    const client = new Inngest({ id: "native-functions", isDev: true });
    const fn = fixtureFunction(client);
    const functions = [fn] as const;

    expect(requireNativeInngestFunctions(functions)).toBe(functions);
    for (const candidate of [{}, null, undefined]) {
      expect(() => requireNativeInngestFunctions([candidate])).toThrow(
        "createInngestFunctions must return native Inngest functions"
      );
    }
  });
});
