import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Cause, Effect, Exit } from "effect";
import { expect, test } from "vitest";

import { createProcessRuntime } from "../../runtime/process-runtime/src/index";
import { provisionProcess } from "../../runtime/substrate/effect/src/index";
import { produceProvisioningFixture } from "./fixtures/provisioning-fixture";
import { produceBindingFixture } from "./fixtures/runtime-binding-fixture";

async function start(root: string, options: Parameters<typeof produceBindingFixture>[1] = {}) {
  const fixture = produceBindingFixture(root, options);
  const provisioned = await provisionProcess({
    compilation: fixture.compilation,
    bootgraph: fixture.bootgraph,
    sources: { appRoot: root, test: fixture.testConfig },
  });
  expect(fixture.calls).toMatchObject({ acquire: 1, child: 0, parent: 0 });
  const runtime = await createProcessRuntime({
    compilation: fixture.compilation,
    provisioned,
    descriptorTable: fixture.descriptorTable,
  });
  return { fixture, provisioned, runtime };
}

test("refused mismatched and duplicate assemblies cannot release the accepted owner's lease", async () => {
  const root = await mkdtemp(join(tmpdir(), "habitat-binding-ownership-"));
  const fixture = produceBindingFixture(root);
  const other = produceBindingFixture(root, { swap: true });
  const provisioned = await provisionProcess({
    compilation: fixture.compilation,
    bootgraph: fixture.bootgraph,
    sources: { appRoot: root, test: fixture.testConfig },
  });
  await expect(
    createProcessRuntime({
      compilation: other.compilation,
      provisioned,
      descriptorTable: other.descriptorTable,
    })
  ).rejects.toThrow(TypeError);
  expect(fixture.calls).toMatchObject({ acquire: 1, release: 0, child: 0, parent: 0 });
  expect(existsSync(fixture.leasePath)).toBe(true);
  const runtime = await createProcessRuntime({
    compilation: fixture.compilation,
    provisioned,
    descriptorTable: fixture.descriptorTable,
  });
  try {
    await expect(
      createProcessRuntime({
        compilation: other.compilation,
        provisioned,
        descriptorTable: other.descriptorTable,
      })
    ).rejects.toThrow(TypeError);
    await expect(
      createProcessRuntime({
        compilation: fixture.compilation,
        provisioned,
        descriptorTable: fixture.descriptorTable,
      })
    ).rejects.toThrow(TypeError);
    expect(fixture.calls).toMatchObject({ acquire: 1, release: 0, child: 2, parent: 3 });
    expect(other.calls.acquire).toBe(0);
    expect(existsSync(fixture.leasePath)).toBe(true);
    const binding = fixture.compilation.plan.surfaces[0].serviceBindings.find(
      (item) => item.localName === "normal"
    );
    if (!binding) throw new Error("Missing normal binding");
    const client = runtime
      .binding(binding.bindingId, fixture.parent)
      .withInvocation({ invocation: { trace: "still-owned" } });
    expect(await Effect.runPromise(client.read("ready"))).toBe(
      "P:still-owned:ready|S:still-owned:ready"
    );
    await runtime.stop();
    expect(fixture.calls.release).toBe(1);
    expect(existsSync(fixture.leasePath)).toBe(false);
  } finally {
    await runtime.stop();
    await rm(root, { recursive: true, force: true });
  }
  expect(fixture.calls.release).toBe(1);
});

test("validates decoded invocation values without decoding again or replacing their identity", async () => {
  const root = await mkdtemp(join(tmpdir(), "habitat-binding-date-"));
  const { fixture, runtime } = await start(root);
  try {
    const binding = fixture.compilation.plan.serviceBindings.find(
      (item) => item.serviceId === fixture.dateService.definition.id
    );
    if (!binding) throw new Error("Missing date binding");
    expect(fixture.invocationCalls).toEqual({ decode: 0, validate: 0 });
    const invocation = new Date("2026-09-05T12:00:00.000Z");
    const client = runtime.binding(binding.bindingId, fixture.dateService);
    const view = client.withInvocation({ invocation });
    expect(await Effect.runPromise(view.read())).toBe(invocation.toISOString());
    expect(fixture.invocationValues).toHaveLength(1);
    expect(fixture.invocationValues[0]).toBe(invocation);
    expect(fixture.invocationCalls).toEqual({ decode: 0, validate: 1 });
    expect(() => client.withInvocation({ invocation: new Date(Number.NaN) })).toThrow(TypeError);
    expect(fixture.invocationCalls).toEqual({ decode: 0, validate: 2 });
  } finally {
    await runtime.stop();
    await rm(root, { recursive: true, force: true });
  }
});

test("binds named children, swapped slots and equal diamonds to exact native cached clients", async () => {
  const root = await mkdtemp(join(tmpdir(), "habitat-binding-"));
  const { fixture, runtime } = await start(root);
  try {
    const bindings = fixture.compilation.plan.surfaces[0].serviceBindings;
    function binding(name: string) {
      const id = bindings.find((item) => item.localName === name)?.bindingId;
      if (!id) throw new Error(`Missing fixture binding ${name}`);
      return { id, client: runtime.binding(id, fixture.parent) };
    }
    const normal = binding("normal");
    const alias = binding("alias");
    const reversed = binding("reversed");
    const diamond = binding("diamond");
    expect(normal.id).toBe(alias.id);
    expect(normal.client).toBe(alias.client);
    expect(normal.id).not.toBe(reversed.id);
    const swapped = produceBindingFixture(root, { swap: true });
    expect(
      swapped.compilation.plan.surfaces[0].serviceBindings.find(
        (item) => item.localName === "normal"
      )?.bindingId
    ).not.toBe(normal.id);
    expect(swapped.calls.acquire).toBe(0);
    expect(diamond.id).not.toBe(normal.id);
    expect(fixture.calls).toMatchObject({ child: 2, parent: 3, effect: 0, promise: 0 });
    const one = normal.client.withInvocation({ invocation: { trace: "one" } });
    const two = normal.client.withInvocation({ invocation: { trace: "two" } });
    const pending = [one.read("x"), two.read("y"), one.read("z")];
    expect(fixture.contexts).toEqual([]);
    expect(await Effect.runPromise(Effect.all(pending))).toEqual([
      "P:one:x|S:one:x",
      "P:two:y|S:two:y",
      "P:one:z|S:one:z",
    ]);
    expect(
      await Effect.runPromise(
        reversed.client.withInvocation({ invocation: { trace: "r" } }).read("x")
      )
    ).toBe("S:r:x|P:r:x");
    expect(
      await Effect.runPromise(
        diamond.client.withInvocation({ invocation: { trace: "d" } }).read("x")
      )
    ).toBe("P:d:x|P:d:x");
    expect(new Set(fixture.contexts).size).toBe(10);
    const primary = fixture.compilation.plan.serviceBindings.find(
      (item) => item.serviceId === fixture.child.definition.id && item.serviceInstance === "primary"
    );
    if (!primary) throw new Error("Missing primary child");
    const child = runtime
      .binding(primary.bindingId, fixture.child)
      .withInvocation({ invocation: { trace: "native" } });
    expect(await Effect.runPromise(child.promise("promise"))).toBe("P:native:promise");
    expect(fixture.calls.promise).toBe(1);
    expect(runtime.access.process.resource(fixture.named, { instance: "primary" })).toEqual({
      label: "P",
    });
    expect(
      runtime.access.process.resource({ ...fixture.named }, { instance: "secondary" })
    ).toEqual({ label: "S" });
    expect(runtime.access.process.optionalResource(fixture.named)).toBeUndefined();
    expect(() => runtime.access.process.resource(fixture.named)).toThrow(TypeError);
    const role = runtime.access.roles.get("server");
    expect(
      role?.forSurface({ surface: "server/api", capability: "binding", instance: "primary-api" })
        .instance
    ).toBe("primary-api");
    expect(() => role?.forSurface({ surface: "server/api", capability: "binding" })).toThrow(
      TypeError
    );
    const error = await Effect.runPromise(Effect.flip(child.missing()));
    expect(error).toMatchObject({ code: "MISSING", data: { id: "P" } });
    expect(runtime.access.process.resource(fixture.lease)).toBe(
      runtime.access.roles.get("server")?.resource(fixture.lease)
    );
    expect(() => runtime.binding(normal.id, fixture.child)).toThrow(TypeError);
    expect(() => runtime.binding("absent", fixture.parent)).toThrow(TypeError);
    const firstStop = runtime.stop();
    expect(runtime.stop()).toBe(firstStop);
    await firstStop;
    expect(existsSync(fixture.leasePath)).toBe(false);
    expect(() => normal.client.withInvocation({ invocation: { trace: "closed" } })).toThrow(
      TypeError
    );
    expect(() => runtime.access.process.resource(fixture.lease)).toThrow(TypeError);
    const closed = await Effect.runPromiseExit(one.read("closed"));
    expect(Exit.isFailure(closed)).toBe(true);
    expect(fixture.calls.child).toBe(2);
  } finally {
    fixture.releaseFinalizer.resolve();
    await runtime.stop();
    await rm(root, { recursive: true, force: true });
  }
});

test("drains an interrupted native finalizer before releasing the process lease", async () => {
  const root = await mkdtemp(join(tmpdir(), "habitat-binding-drain-"));
  const { fixture, runtime } = await start(root);
  try {
    const primary = fixture.compilation.plan.serviceBindings.find(
      (item) => item.serviceId === fixture.child.definition.id && item.serviceInstance === "primary"
    );
    if (!primary) throw new Error("Missing primary child");
    const child = runtime
      .binding(primary.bindingId, fixture.child)
      .withInvocation({ invocation: { trace: "cancel" } });
    const abort = new AbortController();
    const result = Effect.runPromiseExit(child.wait(), { signal: abort.signal });
    await fixture.entered.promise;
    abort.abort();
    const exit = await result;
    expect(Exit.isFailure(exit) && Cause.hasInterrupts(exit.cause)).toBe(true);
    await fixture.finalizing.promise;
    let stopped = false;
    const stopping = runtime.stop();
    void stopping.then(() => {
      stopped = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(stopped).toBe(false);
    expect(fixture.calls.release).toBe(0);
    expect(existsSync(fixture.leasePath)).toBe(true);
    fixture.releaseFinalizer.resolve();
    await stopping;
    expect(fixture.events).toEqual(["acquired", "finalizing", "finalized", "released"]);
  } finally {
    fixture.releaseFinalizer.resolve();
    await runtime.stop();
    await rm(root, { recursive: true, force: true });
  }
});

test("lets an admitted parent finish its second child call while stop refuses new root calls", async () => {
  const root = await mkdtemp(join(tmpdir(), "habitat-binding-nested-drain-"));
  const { fixture, runtime } = await start(root, { pauseParentBetweenChildren: true });
  try {
    const binding = fixture.compilation.plan.surfaces[0].serviceBindings.find(
      (item) => item.localName === "normal"
    );
    if (!binding) throw new Error("Missing normal binding");
    const client = runtime
      .binding(binding.bindingId, fixture.parent)
      .withInvocation({ invocation: { trace: "draining" } });
    const pending = Effect.runPromiseExit(client.read("accepted"));
    await fixture.parentBetweenChildren.promise;
    expect(fixture.calls.effect).toBe(1);
    expect(fixture.events).toEqual([
      "acquired",
      "parent.entered",
      "child.read:P",
      "parent.left.completed",
    ]);

    let stopped = false;
    const stopping = runtime.stop();
    void stopping.then(() => {
      stopped = true;
    });
    const refused = await Effect.runPromiseExit(client.read("unrelated"));
    expect(Exit.isFailure(refused)).toBe(true);
    expect(fixture.events.filter((event) => event === "parent.entered")).toHaveLength(1);
    expect(stopped).toBe(false);
    expect(fixture.calls.release).toBe(0);
    expect(existsSync(fixture.leasePath)).toBe(true);

    fixture.resumeParent.resolve();
    const exit = await pending;
    expect(Exit.isSuccess(exit), Exit.isFailure(exit) ? Cause.pretty(exit.cause) : undefined).toBe(
      true
    );
    if (Exit.isSuccess(exit)) expect(exit.value).toBe("P:draining:accepted|S:draining:accepted");
    await stopping;
    expect(fixture.calls).toMatchObject({ effect: 2, release: 1 });
    expect(fixture.events).toEqual([
      "acquired",
      "parent.entered",
      "child.read:P",
      "parent.left.completed",
      "child.read:S",
      "parent.completed",
      "released",
    ]);
    expect(existsSync(fixture.leasePath)).toBe(false);
  } finally {
    fixture.resumeParent.resolve();
    await runtime.stop();
    await rm(root, { recursive: true, force: true });
  }
});

test("a constructor failure rolls back the already provisioned native lease", async () => {
  const root = await mkdtemp(join(tmpdir(), "habitat-binding-failure-"));
  const fixture = produceBindingFixture(root, { failConstructor: true });
  try {
    const provisioned = await provisionProcess({
      compilation: fixture.compilation,
      bootgraph: fixture.bootgraph,
      sources: { appRoot: root, test: fixture.testConfig },
    });
    await expect(
      createProcessRuntime({
        compilation: fixture.compilation,
        provisioned,
        descriptorTable: fixture.descriptorTable,
      })
    ).rejects.toThrow("constructor refused");
    await expect(
      createProcessRuntime({
        compilation: fixture.compilation,
        provisioned,
        descriptorTable: fixture.descriptorTable,
      })
    ).rejects.toThrow(TypeError);
    expect(fixture.calls).toMatchObject({ acquire: 1, release: 1, child: 1, parent: 0 });
    expect(existsSync(fixture.leasePath)).toBe(false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("resource access preserves selected role boundaries and equivalent neutral declarations", async () => {
  const root = await mkdtemp(join(tmpdir(), "habitat-binding-access-"));
  const fixture = produceProvisioningFixture(root, {
    cohost: true,
    lifetime: "role",
    role: "server",
  });
  const provisioned = await provisionProcess({
    compilation: fixture.compilation,
    bootgraph: fixture.bootgraph,
    sources: { appRoot: root },
  });
  const runtime = await createProcessRuntime({
    compilation: fixture.compilation,
    provisioned,
    descriptorTable: fixture.descriptorTable,
  });
  try {
    const resource = fixture.serverRequirement.resource;
    const server = runtime.access.roles.get("server");
    const asyncRole = runtime.access.roles.get("async");
    expect(server).toBeDefined();
    expect(runtime.access.process.optionalResource(resource)).toBeUndefined();
    expect(asyncRole?.optionalResource(resource)).toBeUndefined();
    expect(() => runtime.access.process.resource(resource)).toThrow(TypeError);
    expect(server?.resource({ ...resource })).toBe(server?.resource(resource));
    expect(() => server?.forSurface({ surface: "async/workflow", capability: "lease" })).toThrow(
      TypeError
    );
    expect(server?.forSurface({ surface: "server/api", capability: "lease" }).roleAccess).toBe(
      server
    );
  } finally {
    await runtime.stop();
    await rm(root, { recursive: true, force: true });
  }
});
