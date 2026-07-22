import { Type } from "typebox";
import { Settings } from "typebox/system";
import { describe, expect, test } from "vitest";
import {
  CellKeySchema,
  closedObject,
  createPreparedCellSchema,
  createRuntimeConfigSchema,
  DataNotPortable,
  decodeStructural,
  MaximumTimerDelayMs,
  RuntimeBaseConfigSchema,
  SchemaExecutableNotPortable,
  SchemaPropertyCollision,
  type StageOutput,
  snapshot,
  validateCellKeySemantics,
  validatePredecessorSemantics,
  validateRuntimeBaseConfigSemantics,
} from "../src/contracts/index.js";
import { digestIdentity, stageOutput } from "./fixtures.js";

describe("closed TypeBox contracts", () => {
  test("reject unknown and merely coercible input without correcting it", () => {
    const schema = closedObject({}, { count: Type.Integer() });

    expect(decodeStructural(schema, { count: 1, extra: true }).kind).toBe("Invalid");
    expect(decodeStructural(schema, { count: "1" }).kind).toBe("Invalid");
    expect(decodeStructural(schema, { count: 1 })).toEqual({
      kind: "Valid",
      value: { count: 1 },
    });
  });

  test("remains noncorrective when process-global corrective parsing is enabled", () => {
    const previous = Settings.Get().correctiveParse;
    Settings.Set({ correctiveParse: true });

    try {
      const schema = closedObject({}, { count: Type.Integer({ default: 3 }) });

      expect(decodeStructural(schema, { count: "1" }).kind).toBe("Invalid");
      expect(decodeStructural(schema, { count: 1, extra: true }).kind).toBe("Invalid");
      expect(decodeStructural(schema, {}).kind).toBe("Invalid");
    } finally {
      Settings.Set({ correctiveParse: previous });
    }
  });

  test("rejects generic and subject property collisions before construction", () => {
    const shared = { caseId: Type.String() };

    if (false) {
      // @ts-expect-error overlapping keys are forbidden at the type boundary
      closedObject(shared, { caseId: Type.Number() });
    }

    expect(() =>
      Reflect.apply(closedObject, undefined, [shared, { caseId: Type.Number() }])
    ).toThrow(SchemaPropertyCollision);
  });

  test("clones and deeply freezes only at the explicit snapshot boundary", () => {
    const original = { nested: { values: [1, 2] } };
    const frozen = snapshot(original);

    original.nested.values.push(3);

    expect(frozen).toEqual({ nested: { values: [1, 2] } });
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.nested)).toBe(true);
    expect(Object.isFrozen(frozen.nested.values)).toBe(true);

    const durable = snapshot(stageOutput({ answer: 42 }));
    expect(Object.isFrozen(durable)).toBe(true);
    expect(Object.isFrozen(durable.value)).toBe(true);
  });

  test("makes callback-bearing durable values and schemas unrepresentable", () => {
    if (false) {
      // @ts-expect-error callbacks cannot inhabit durable stage output values
      const callback: StageOutput<"Example", () => void>["value"] = () => {};
      void callback;

      const symbolKey = Symbol("hidden");
      const symbolValue = { [symbolKey]: "not portable" };
      // @ts-expect-error symbol-keyed values cannot inhabit durable outputs
      const symbolOutput: StageOutput<"Example", typeof symbolValue>["value"] = symbolValue;
      void symbolOutput;

      // @ts-expect-error callback schemas are not portable durable values
      createPreparedCellSchema(Type.Function([], Type.Void()));

      createPreparedCellSchema(
        // @ts-expect-error callback-bearing refinements are not portable schemas
        Type.Refine(Type.String(), (value) => value.length > 0)
      );

      createPreparedCellSchema(
        // @ts-expect-error nested callback-bearing refinements are not portable
        Type.Object({
          name: Type.Refine(Type.String(), (value) => value.length > 0),
        })
      );

      createPreparedCellSchema(
        // @ts-expect-error constructor schemas are not portable durable values
        Type.Constructor([], Type.Object({ id: Type.String() }))
      );

      createPreparedCellSchema(
        // @ts-expect-error nested constructor schemas are not portable
        Type.Object({
          factory: Type.Constructor([], Type.Object({ id: Type.String() })),
        })
      );
    }

    expect(() =>
      Reflect.apply(createPreparedCellSchema, undefined, [
        Type.Refine(Type.String(), (value) => value.length > 0),
      ])
    ).toThrow(SchemaExecutableNotPortable);

    expect(() =>
      Reflect.apply(createPreparedCellSchema, undefined, [
        Type.Object({
          aliases: Type.Array(Type.Refine(Type.String(), (value) => value.length > 0)),
        }),
      ])
    ).toThrow(SchemaExecutableNotPortable);

    expect(() =>
      Reflect.apply(createPreparedCellSchema, undefined, [
        Type.Object({
          factory: Type.Constructor([], Type.Object({ id: Type.String() })),
        }),
      ])
    ).toThrow(SchemaExecutableNotPortable);

    expect(() =>
      Reflect.apply(createPreparedCellSchema, undefined, [Type.Function([], Type.Void())])
    ).toThrow(SchemaExecutableNotPortable);
  });

  test("rejects symbol-keyed and other non-portable runtime data", () => {
    const hidden = Symbol("hidden");
    const value = { visible: 1, [hidden]: { mutable: true } };
    const schema = closedObject({}, { visible: Type.Number() });

    expect(decodeStructural(schema, value)).toEqual({
      kind: "Invalid",
      issues: [expect.objectContaining({ keyword: "portable" })],
    });
    expect(() => Reflect.apply(snapshot, undefined, [value])).toThrow(DataNotPortable);
    expect(() => Reflect.apply(snapshot, undefined, [{ value: Number.NaN }])).toThrow(
      DataNotPortable
    );
  });
});

describe("runtime configuration", () => {
  const config = {
    sdk: {
      packageName: "@rawr/research-sdk" as const,
      packageVersion: "0.1.0",
      protocolVersion: "1",
      implementationRevision: "sdk-1",
    },
    runtimeRoot: "/var/lib/rawr-research/runtime",
    outputRoot: "/var/lib/rawr-research/output",
    command: {
      environment: { LANG: "C.UTF-8" },
      timeoutMs: 10_000,
      terminationGraceMs: 1_000,
    },
    operationalEvents: {
      serviceName: "research-sdk",
      serviceVersion: "0.1.0",
      environment: "test",
    },
  };
  const paths = {
    resolvedRuntimeRoot: config.runtimeRoot,
    resolvedOutputRoot: config.outputRoot,
    temporaryRoots: ["/tmp", "/private/tmp", "/var/tmp"],
  };

  test("decodes one closed public config and rejects subject key collisions", () => {
    expect(decodeStructural(RuntimeBaseConfigSchema, config).kind).toBe("Valid");
    expect(decodeStructural(RuntimeBaseConfigSchema, { ...config, subject: "leak" }).kind).toBe(
      "Invalid"
    );

    if (false) {
      // @ts-expect-error subject configuration cannot redefine generic identity
      createRuntimeConfigSchema({ runtimeRoot: Type.String() });
    }
    expect(() =>
      Reflect.apply(createRuntimeConfigSchema, undefined, [{ runtimeRoot: Type.String() }])
    ).toThrow(SchemaPropertyCollision);
  });

  test("separates structural decoding from path, deadline, and secret semantics", () => {
    expect(validateRuntimeBaseConfigSemantics(config, paths)).toEqual([]);

    const issues = validateRuntimeBaseConfigSemantics(
      {
        ...config,
        runtimeRoot: "/tmp/runtime",
        command: {
          environment: { SERVICE_TOKEN: "must-not-be-committed" },
          timeoutMs: MaximumTimerDelayMs,
          terminationGraceMs: 1,
        },
      },
      {
        ...paths,
        resolvedRuntimeRoot: "/tmp/runtime",
      }
    );

    expect(issues.map(({ code }) => code)).toEqual([
      "runtime.temporary-root",
      "runtime.deadline-overflow",
      "runtime.secret-in-public-environment",
    ]);
  });

  test("requires configured roots to equal externally resolved canonical roots", () => {
    expect(
      validateRuntimeBaseConfigSemantics(config, {
        ...paths,
        resolvedRuntimeRoot: "/private/var/lib/rawr-research/runtime",
      })
    ).toEqual([expect.objectContaining({ code: "runtime.root-not-resolved" })]);
  });
});

describe("identity semantics", () => {
  test("distinguishes equal bytes hashed under different authority preimages", () => {
    const raw = digestIdentity("packet.raw-manifest.v1", { value: 1 });
    const canonical = digestIdentity("packet.stable-json.v1", { value: 1 });

    expect(raw.value).toBe(canonical.value);
    expect(raw).not.toEqual(canonical);
  });

  test("keeps structural checking separate from governed instance semantics", () => {
    const derived = {
      study: { studyId: "study", revision: "1" },
      caseId: "case",
      conditionId: "candidate",
      profileId: "model-free",
      instance: {
        kind: "Replay" as const,
        instanceId: "same",
        predecessorInstanceId: "same",
        reason: "explicit replay",
      },
    };

    expect(decodeStructural(CellKeySchema, derived).kind).toBe("Valid");
    expect(validateCellKeySemantics(derived)).toEqual([
      expect.objectContaining({ code: "instance.self-predecessor" }),
    ]);
  });

  test("rejects malformed original and derived instance variants structurally", () => {
    const base = {
      study: { studyId: "study", revision: "1" },
      caseId: "case",
      conditionId: "candidate",
      profileId: "model-free",
    };

    expect(
      decodeStructural(CellKeySchema, {
        ...base,
        instance: {
          kind: "Replicate",
          instanceId: "replicate-1",
          predecessorInstanceId: "original-1",
        },
      }).kind
    ).toBe("Invalid");
    expect(
      decodeStructural(CellKeySchema, {
        ...base,
        instance: {
          kind: "Original",
          instanceId: "original-1",
          predecessorInstanceId: "earlier",
          reason: "not legal on an original",
        },
      }).kind
    ).toBe("Invalid");
  });

  test("requires canonical predecessor ordering after structural checking", () => {
    const first = digestIdentity("stage-output.v1", "a");
    const second = digestIdentity("stage-output.v1", "b");
    const ordered = [first, second].sort((left, right) => left.value.localeCompare(right.value));

    expect(validatePredecessorSemantics({ kind: "Set", digests: ordered })).toEqual([]);
    expect(validatePredecessorSemantics({ kind: "Set", digests: [...ordered].reverse() })).toEqual([
      expect.objectContaining({ code: "predecessors.noncanonical-order" }),
    ]);
  });
});
