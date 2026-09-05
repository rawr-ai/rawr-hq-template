import { expect, test } from "bun:test";

import { createInngestFixture } from "../../process-runtime/test/inngest-fixture";
import { createInngestHarness } from "../inngest/index";

async function port() {
  const reservation = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response() });
  const port = reservation.port;
  await reservation.stop(true);
  if (port === undefined) throw new Error("Native test port was not allocated.");
  return port;
}

function input(fixture: ReturnType<typeof createInngestFixture>) {
  return {
    launchIdentity: fixture.ready.identity,
    roles: fixture.ready.roles,
    mountReadyPayloads: fixture.ready.records,
    processAccess: fixture.ready.processAccess,
    requiredResources: fixture.ready.requiredResources,
    reports: { report() {} },
  };
}

test("cold Inngest descriptor mounts one real Bun Serve and stops without releasing process resources", async () => {
  const fixture = createInngestFixture({ ids: ["one", "two"] });
  const baseline = [...fixture.client.middleware];
  const listenPort = await port();
  const descriptor = createInngestHarness({
    id: "test-inngest",
    client: fixture.resource,
    mode: "serve",
    hostname: "127.0.0.1",
    port: listenPort,
    path: "/api/inngest",
  });
  expect(fixture.calls.access).toBe(0);
  expect(fixture.calls.run).toBe(0);
  expect(descriptor.surfaces).toEqual(["async/workflow", "async/schedule", "async/consumer"]);
  const handle = await descriptor.mount(input(fixture));
  const url = `http://127.0.0.1:${listenPort}/api/inngest`;
  try {
    expect((await handle.readiness?.())?.status).toBe("passing");
    expect((await handle.liveness?.())?.launchIdentity).toBe(fixture.ready.identity);
    const response = await fetch(url);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ function_count: 2 });
    expect((await fetch(`http://127.0.0.1:${listenPort}/other`)).status).toBe(404);
    expect(fixture.calls).toEqual({ body: 0, run: 0, decode: 0, access: 1 });
    fixture.ready.closeAdmission();
    const stopping = handle.stop();
    expect(handle.stop()).toBe(stopping);
    await stopping;
    expect((await handle.readiness?.())?.status).toBe("failing");
    expect(fixture.client.middleware).toEqual(baseline);
    expect(fixture.calls.access).toBe(1);
    const afterStop = await fetch(url).catch(() => undefined);
    expect(afterStop === undefined || afterStop.status === 503).toBe(true);
  } finally {
    await handle.stop();
    await fixture.ready.stop();
  }
});

test("native generated failure function collisions refuse before listen and remove owned middleware", async () => {
  const fixture = createInngestFixture({
    ids: ["work", "work-failure"],
    options: { onFailure: async () => undefined },
  });
  const baseline = [...fixture.client.middleware];
  const listenPort = await port();
  const descriptor = createInngestHarness({
    id: "test-inngest",
    client: fixture.resource,
    mode: "serve",
    hostname: "127.0.0.1",
    port: listenPort,
    path: "/api/inngest",
  });
  try {
    await expect(descriptor.mount(input(fixture))).rejects.toThrow("registration ids collide");
    expect(fixture.client.middleware).toEqual(baseline);
    expect(fixture.calls.body).toBe(0);
    const replacement = Bun.serve({
      hostname: "127.0.0.1",
      port: listenPort,
      fetch: () => new Response(),
    });
    await replacement.stop(true);
  } finally {
    await fixture.ready.stop();
  }
});

test("copied bundles and required-resource refusal never touch the native client", async () => {
  const fixture = createInngestFixture();
  const descriptor = createInngestHarness({
    id: "test-inngest",
    client: fixture.resource,
    mode: "connect",
    options: { isolateExecution: true },
  });
  try {
    await expect(
      descriptor.mount({ ...input(fixture), requiredResources: { ready: false, resources: [] } })
    ).rejects.toThrow("readiness");
    await expect(
      descriptor.mount({
        ...input(fixture),
        mountReadyPayloads: fixture.ready.records.map((record) => ({
          ...record,
          payload: { ...record.payload },
        })),
      })
    ).rejects.toThrow("exact process-owned");
    expect(fixture.calls.access).toBe(0);
  } finally {
    await fixture.ready.stop();
  }
});
