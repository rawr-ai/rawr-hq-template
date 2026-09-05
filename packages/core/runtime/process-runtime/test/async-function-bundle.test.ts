import { expect, test } from "bun:test";
import { Inngest, type InngestFunction, type Middleware } from "inngest";

import {
  materializeInngestFunctions,
  readInngestFunctionBundle,
} from "../src/async-function-bundle";
import { createInngestFixture } from "./inngest-fixture";

function gate() {
  let resolve = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function requestArgs(
  fn: InngestFunction.Any,
  request: Request,
  next: () => Promise<Middleware.Response>
): Middleware.WrapRequestArgs {
  return {
    fn,
    next,
    requestArgs: [request],
    runId: "native-hook-unit",
    requestInfo: { method: "POST", headers: {}, url: new URL(request.url), body: async () => ({}) },
  };
}

test("cold bundles retain native options and reject copied, mixed or twice-materialized ownership", async () => {
  const fixture = createInngestFixture({
    ids: ["one", "two"],
    options: { retries: 1, checkpointing: false },
  });
  const baseline = [...fixture.client.middleware];
  expect(fixture.calls).toEqual({ body: 0, run: 0, decode: 0, access: 0 });
  const first = fixture.payloads[0];
  if (first === undefined) throw new Error("Missing fixture bundle.");
  expect(() => readInngestFunctionBundle({ ...first })).toThrow(TypeError);
  const foreign = createInngestFixture({ ids: ["foreign"] });
  await expect(
    materializeInngestFunctions([...fixture.payloads, ...foreign.payloads], {
      client: fixture.client,
    })
  ).rejects.toThrow("one exact process");
  expect(fixture.client.middleware).toEqual(baseline);
  const cohort = await materializeInngestFunctions(fixture.payloads, { client: fixture.client });
  try {
    expect(cohort.functions.map((fn) => fn.id())).toEqual(["one", "two"]);
    expect(
      cohort.functions.every((fn) => fn.opts.retries === 1 && fn.opts.checkpointing === false)
    ).toBe(true);
    expect(cohort.functions[0]?.opts.triggers).toEqual([{ event: "test/one" }]);
    expect(fixture.client.middleware).toHaveLength(baseline.length + 1);
    expect(fixture.calls).toEqual({ body: 0, run: 0, decode: 0, access: 0 });
    await expect(
      materializeInngestFunctions(fixture.payloads, { client: fixture.client })
    ).rejects.toThrow("unclaimed bundles");
  } finally {
    await cohort.closeAndDrain();
    cohort.uninstallMiddleware();
    await Promise.all([fixture.ready.stop(), foreign.ready.stop()]);
  }
  expect(fixture.client.middleware).toEqual(baseline);
});

test("finite native request middleware drains after next and inherits an admitted Serve request", async () => {
  const fixture = createInngestFixture();
  const cohort = await materializeInngestFunctions(fixture.payloads, { client: fixture.client });
  const MiddlewareClass = fixture.client.middleware[0];
  const fn = cohort.functions[0];
  if (MiddlewareClass === undefined || fn === undefined)
    throw new Error("Missing native materialization.");
  const middleware = new MiddlewareClass({ client: fixture.client });
  if (middleware.wrapRequest === undefined) throw new Error("Missing native request hook.");
  const beforeNative = gate();
  const afterNative = gate();
  const entered = gate();
  const request = new Request("http://localhost/api/inngest", { method: "POST" });
  const response = { status: 200, headers: {}, body: "native-result" };
  const pending = cohort.trackHandler(request, async () => {
    entered.resolve();
    await beforeNative.promise;
    return middleware.wrapRequest?.(
      requestArgs(fn, request, async () => {
        await afterNative.promise;
        return response;
      })
    );
  });
  await entered.promise;
  fixture.ready.closeAdmission();
  const drain = cohort.closeAndDrain();
  expect(cohort.closeAndDrain()).toBe(drain);
  let drained = false;
  void drain.then(() => {
    drained = true;
  });
  try {
    beforeNative.resolve();
    for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(drained).toBe(false);
    await expect(cohort.trackHandler(new Request(request), async () => response)).rejects.toThrow(
      TypeError
    );
    afterNative.resolve();
    expect(await pending).toBe(response);
    await drain;
  } finally {
    beforeNative.resolve();
    afterNative.resolve();
    await pending;
    await drain;
    cohort.uninstallMiddleware();
    await fixture.ready.stop();
  }
});

test("two native cohorts on one client keep exact function scope and remove only their own middleware", async () => {
  const client = new Inngest({ id: "shared-native-test-client", isDev: true });
  const baseline = [...client.middleware];
  const first = createInngestFixture({ ids: ["one"], client });
  const second = createInngestFixture({ ids: ["two"], client });
  const a = await materializeInngestFunctions(first.payloads, { client });
  const A = client.middleware[0];
  const b = await materializeInngestFunctions(second.payloads, { client });
  const B = client.middleware[0];
  const fn = a.functions[0];
  if (A === undefined || B === undefined || fn === undefined)
    throw new Error("Missing native cohort.");
  const mwA = new A({ client });
  const mwB = new B({ client });
  if (mwA.wrapRequest === undefined || mwB.wrapRequest === undefined)
    throw new Error("Missing native hooks.");
  const hold = gate();
  const entered = gate();
  const request = new Request("http://localhost/api/inngest");
  const error = new Error("original native middleware rejection");
  const pending = mwB.wrapRequest(
    requestArgs(fn, request, () => {
      if (mwA.wrapRequest === undefined) throw new Error("Missing native hook.");
      return mwA.wrapRequest(
        requestArgs(fn, request, async () => {
          entered.resolve();
          await hold.promise;
          throw error;
        })
      );
    })
  );
  void pending.catch(() => {});
  await entered.promise;
  try {
    await b.closeAndDrain();
    b.uninstallMiddleware();
    expect(client.middleware).toEqual([A, ...baseline]);
    const drain = a.closeAndDrain();
    let drained = false;
    void drain.then(() => {
      drained = true;
    });
    await Promise.resolve();
    expect(drained).toBe(false);
    hold.resolve();
    await expect(pending).rejects.toBe(error);
    await drain;
  } finally {
    hold.resolve();
    await pending.catch(() => {});
    await a.closeAndDrain();
    a.uninstallMiddleware();
    await Promise.all([first.ready.stop(), second.ready.stop()]);
  }
  expect(client.middleware).toEqual(baseline);
});

test("cross-surface duplicate native ids refuse before client registration", async () => {
  const fixture = createInngestFixture({ ids: ["same", "same"] });
  const baseline = [...fixture.client.middleware];
  await expect(
    materializeInngestFunctions(fixture.payloads, { client: fixture.client })
  ).rejects.toThrow("duplicate native ids");
  expect(fixture.client.middleware).toEqual(baseline);
  expect(fixture.calls.run).toBe(0);
  await fixture.ready.stop();
});

test("simultaneous materialization reserves the exact bundles before the native import yields", async () => {
  const fixture = createInngestFixture();
  const baseline = [...fixture.client.middleware];
  const results = await Promise.allSettled([
    materializeInngestFunctions(fixture.payloads, { client: fixture.client }),
    materializeInngestFunctions(fixture.payloads, { client: fixture.client }),
  ]);
  try {
    expect(results[0]?.status).toBe("fulfilled");
    expect(results[1]?.status).toBe("rejected");
    expect(fixture.client.middleware).toHaveLength(baseline.length + 1);
  } finally {
    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      await result.value.closeAndDrain();
      result.value.uninstallMiddleware();
    }
    await fixture.ready.stop();
  }
  expect(fixture.client.middleware).toEqual(baseline);
});
