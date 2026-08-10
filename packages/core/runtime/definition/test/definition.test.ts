import { describe, expect, test } from "bun:test";
import { Type } from "typebox";
import { Validator } from "typebox/schema";
import { RuntimeSchema } from "../../schema/src";
import {
  defineApp,
  defineEntrypoint,
  definePlugin,
  defineProcessCatalog,
  defineRuntimeProfile,
  defineRuntimeProvider,
  defineRuntimeResource,
  defineService,
  Effect,
  providerFx,
  RuntimeObservationRecordSchema,
  readHabitatEffectOperation,
  resourceDep,
  runtimeLaunchIdentity,
  TaggedError,
} from "../src";

describe("runtime definition", () => {
  test("creates a frozen cold app, process, profile, and entrypoint graph", () => {
    const resource = defineRuntimeResource<"clock", { now(): Date }>({
      id: "clock",
      title: "Clock",
      purpose: "Supplies process time.",
    });
    const provider = defineRuntimeProvider({
      id: "clock.system",
      title: "System clock",
      provides: resource,
      requires: [],
      build: () => providerFx.acquireRelease({ acquire: () => ({ now: () => new Date(0) }) }),
    });
    const service = defineService({ id: "work", deps: { clock: resourceDep(resource) } });
    const plugin = definePlugin({
      id: "work.api",
      role: "server",
      surface: "api.public",
      capability: "work",
      serviceUses: [],
      resourceRequirements: [],
      project: ({ pluginId }) => ({ kind: "plugin.projection", facts: { pluginId } }),
    });
    const app = defineApp({ id: "example", plugins: [plugin] });
    const processes = defineProcessCatalog({
      server: { id: "example.server", roles: ["server"] },
      async: { id: "example.async", roles: ["async"], harness: "inngest.serve" },
    });
    const profile = defineRuntimeProfile({
      id: "example.production",
      providers: [
        {
          kind: "runtime.provider-selection",
          resource,
          provider,
        },
      ],
      configSources: [{ kind: "env" }],
    });
    const identity = runtimeLaunchIdentity({
      appId: app.id,
      processId: processes.server.id,
      entrypointId: "server",
      deploymentId: "deploy-1",
      sourceRevision: "abc123",
    });
    const entrypoint = defineEntrypoint({
      id: "server",
      app,
      profile,
      process: processes.server,
      identity,
    });

    expect(service.deps.clock.resource).toBe(resource);
    expect(entrypoint.identity).toEqual(identity);
    for (const value of [
      resource,
      provider,
      service,
      plugin,
      app,
      processes,
      profile,
      identity,
      entrypoint,
    ]) {
      expect(Object.isFrozen(value)).toBe(true);
    }
    expect(Object.isFrozen(processes.server.roles)).toBe(true);
  });

  test("keeps HabitatEffect and provider plans cold", () => {
    let attempts = 0;
    const effect = Effect.tryPromise({
      try: () => {
        attempts += 1;
        return "done";
      },
      catch: (cause) => cause,
    });
    const plan = providerFx.acquireRelease({
      acquire: () => {
        attempts += 1;
        return "value";
      },
    });

    expect(attempts).toBe(0);
    expect(readHabitatEffectOperation(effect).kind).toBe("try-promise");
    expect(plan.operation.kind).toBe("acquire-release");
  });

  test("preserves yieldability and Effect-style tagged errors", () => {
    class Failure extends TaggedError("Failure")<{ readonly reason: string }> {}
    const failure = new Failure({ reason: "nope" });
    const yielded = Effect.succeed(42)[Symbol.iterator]();

    expect(failure).toEqual({ _tag: "Failure", reason: "nope" });
    expect(yielded.next().value).toHaveProperty("kind", "habitat.effect");
    expect(yielded.next(42)).toEqual({ done: true, value: 42 });
  });

  test("publishes one TypeBox observation record schema", () => {
    const validator = new Validator({}, RuntimeObservationRecordSchema);
    expect(
      validator.Check({
        phase: "definition",
        boundary: "app",
        kind: "app.declared",
        correlationId: "example",
        payload: { id: "example" },
      })
    ).toBe(true);
    expect(validator.Check({ phase: "live" })).toBe(false);
  });

  test("depends on the runtime-schema owner for provider config", () => {
    const schema = RuntimeSchema.fromTypeBox(Type.Object({ token: Type.String() }), {
      redaction: { paths: ["token"] },
    });
    expect(schema.decode({ token: "secret" })).toEqual({
      success: true,
      value: { token: "secret" },
    });
    expect(schema.toRedactedShape()).toHaveProperty("redaction.paths", ["token"]);
  });
});
