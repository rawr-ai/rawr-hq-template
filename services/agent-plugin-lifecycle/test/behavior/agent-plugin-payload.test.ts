import type { Static } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, expectTypeOf, it } from "vitest";

import {
  AgentPluginPayloadRecordSchema,
  MAX_PAYLOAD_ENTRIES_PER_MEMBER,
  type NormalizedFileMode,
  NormalizedFileModeSchema,
  type PayloadEntryInput,
  PayloadEntryInputShapeSchema,
  PayloadEntryRecordSchema,
  type PayloadManifestEntry,
  PayloadManifestEntrySchema,
} from "../../src/service/model/dto/agent-plugin-payload";
import {
  createAgentPluginPayload,
  payloadEntryBytes,
  verifyAgentPluginPayload,
} from "../../src/service/model/policy/agent-plugin-payload";
import {
  canonicalSerializeAgentPluginPayload,
  canonicalSerializePayloadEntries,
} from "../../src/service/model/policy/agent-plugin-payload-codec";
import {
  parseNormalizedFileMode,
  samePayloadManifest,
} from "../../src/service/model/policy/payload-manifest";
import { contentDigest } from "../../src/service/model/policy/release-digest";
import { must, productFixture, wire } from "../support/service/release-fixtures";

const encoder = new TextEncoder();

describe("agent-plugin payload", () => {
  it("keeps runtime bytes outside the projectable input shape and closes every record", () => {
    expectTypeOf<Static<typeof PayloadEntryInputShapeSchema>["bytes"]>().toEqualTypeOf<unknown>();
    expectTypeOf<PayloadEntryInput["bytes"]>().toEqualTypeOf<Uint8Array>();

    const payload = productFixture().alphaPayload;
    const payloadWire = wire(canonicalSerializeAgentPluginPayload(payload));
    const cases = [
      {
        schema: PayloadEntryInputShapeSchema,
        value: {
          path: payload.entries[0]!.path,
          mode: payload.entries[0]!.mode,
          bytes: payloadEntryBytes(payload.entries[0]!),
        },
      },
      { schema: PayloadEntryRecordSchema, value: payloadWire.entries[0]! },
      { schema: PayloadManifestEntrySchema, value: payloadWire.manifest[0]! },
      { schema: AgentPluginPayloadRecordSchema, value: payloadWire },
    ];

    for (const { schema, value } of cases) {
      expect(Value.Check(schema, value)).toBe(true);
      const missing = { ...value } as Record<string, unknown>;
      delete missing[Object.keys(schema.properties)[0]!];
      expect(Value.Check(schema, missing)).toBe(false);
      expect(Value.Check(schema, { ...value, extra: true })).toBe(false);
    }
  });

  it("admits the runtime byte container at payload policy rather than through a wire schema", () => {
    const candidate = { path: "a", mode: 0o644, bytes: [0, 1, 2] };

    expect(Value.Check(PayloadEntryInputShapeSchema, candidate)).toBe(true);
    expect(createAgentPluginPayload([candidate])).toEqual({
      ok: false,
      issues: [
        {
          code: "EXPECTED_BYTES",
          path: "payload.entries[0].bytes",
          message: "Payload bytes must be a Uint8Array",
        },
      ],
    });
  });

  it("derives normalized file modes from one closed TypeBox authority", () => {
    expectTypeOf<NormalizedFileMode>().toEqualTypeOf<Static<typeof NormalizedFileModeSchema>>();

    for (const mode of [0o644, 0o755] as const) {
      expect(Value.Check(NormalizedFileModeSchema, mode)).toBe(true);
      expect(parseNormalizedFileMode(mode, "payload.mode")).toEqual({
        ok: true,
        value: mode,
      });
    }

    for (const candidate of [0o600, "0644", 420.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(Value.Check(NormalizedFileModeSchema, candidate), String(candidate)).toBe(false);
    }
  });

  it("splits unsupported normalized modes from non-integer mode diagnostics", () => {
    expect(parseNormalizedFileMode(0o600, "payload.entries[0].mode")).toEqual({
      ok: false,
      issues: [
        {
          code: "INVALID_MODE",
          path: "payload.entries[0].mode",
          message: "File mode must be normalized to 0644 or 0755",
          expected: "0644|0755",
          actual: 0o600,
        },
      ],
    });

    for (const candidate of ["0644", 420.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(parseNormalizedFileMode(candidate, "payload.manifest[0].mode")).toEqual({
        ok: false,
        issues: [
          {
            code: "EXPECTED_INTEGER",
            path: "payload.manifest[0].mode",
            message: "Value must be a safe integer",
          },
        ],
      });
    }
  });

  it("rejects an unsupported payload protocol version before TypeBox admission", () => {
    const payloadWire = wire(canonicalSerializeAgentPluginPayload(productFixture().alphaPayload));
    payloadWire.protocolVersion = 2;

    expect(Value.Check(AgentPluginPayloadRecordSchema, payloadWire)).toBe(false);
    expect(verifyAgentPluginPayload(payloadWire)).toEqual({
      ok: false,
      issues: [
        {
          code: "INVALID_SCHEMA_VERSION",
          path: "payload.protocolVersion",
          message: "Unsupported payload protocol version",
          expected: 1,
          actual: 2,
        },
      ],
    });
  });

  it("owns payload bytes, sorts entries, and emits exactly one trailing LF", () => {
    const mutable = encoder.encode("owned\n");
    const first = must(
      createAgentPluginPayload([
        { path: "z.txt", mode: 0o644, bytes: mutable },
        { path: "a.sh", mode: 0o755, bytes: encoder.encode("a\n") },
      ])
    );
    const second = must(
      createAgentPluginPayload([
        { path: "a.sh", mode: 0o755, bytes: encoder.encode("a\n") },
        { path: "z.txt", mode: 0o644, bytes: encoder.encode("owned\n") },
      ])
    );
    mutable.fill(0);

    expect(first.payloadDigest).toBe(second.payloadDigest);
    expect(first.entries.map((entry) => entry.path)).toEqual(["a.sh", "z.txt"]);
    const owned = payloadEntryBytes(first.entries[1]!);
    owned.fill(0);
    expect(new TextDecoder().decode(payloadEntryBytes(first.entries[1]!))).toBe("owned\n");
    const bytes = canonicalSerializeAgentPluginPayload(first);
    expect(bytes.at(-1)).toBe(0x0a);
    expect(bytes.at(-2)).not.toBe(0x0a);
  });

  it("changes payload identity for path, mode, or exact bytes", () => {
    const base = must(
      createAgentPluginPayload([{ path: "a", mode: 0o644, bytes: encoder.encode("x") }])
    );
    const path = must(
      createAgentPluginPayload([{ path: "b", mode: 0o644, bytes: encoder.encode("x") }])
    );
    const mode = must(
      createAgentPluginPayload([{ path: "a", mode: 0o755, bytes: encoder.encode("x") }])
    );
    const bytes = must(
      createAgentPluginPayload([{ path: "a", mode: 0o644, bytes: encoder.encode("y") }])
    );
    expect(
      new Set([base.payloadDigest, path.payloadDigest, mode.payloadDigest, bytes.payloadDigest])
        .size
    ).toBe(4);
  });

  it("rejects unsafe paths, duplicate paths, unknown fields, and manifest tampering", () => {
    expect(
      createAgentPluginPayload([{ path: "../escape", mode: 0o644, bytes: new Uint8Array() }]).ok
    ).toBe(false);
    expect(
      createAgentPluginPayload([
        { path: "same", mode: 0o644, bytes: new Uint8Array() },
        { path: "same", mode: 0o644, bytes: new Uint8Array() },
      ]).ok
    ).toBe(false);

    const fixture = productFixture();
    const payloadWire = wire(canonicalSerializeAgentPluginPayload(fixture.alphaPayload));
    payloadWire.extra = true;
    expect(verifyAgentPluginPayload(payloadWire).ok).toBe(false);
    delete payloadWire.extra;
    payloadWire.entries[0].bytesBase64 = "eA==";
    const verified = verifyAgentPluginPayload(payloadWire);
    expect(verified.ok).toBe(false);
    if (!verified.ok)
      expect(verified.issues.map((entry) => entry.code)).toContain("PAYLOAD_DIGEST_MISMATCH");
  });

  it("projects malformed payload records into schema-owned aggregate diagnostics", () => {
    expect(createAgentPluginPayload([null])).toEqual({
      ok: false,
      issues: [
        {
          code: "EXPECTED_OBJECT",
          path: "payload.entries[0]",
          message: "Value must be an object",
        },
      ],
    });
    expect(
      createAgentPluginPayload([
        {
          path: "a",
          mode: 0o644,
          extra: true,
        },
      ])
    ).toEqual({
      ok: false,
      issues: [
        {
          code: "UNKNOWN_FIELD",
          path: "payload.entries[0]",
          message: "Expected exactly: bytes, mode, path",
        },
      ],
    });

    const root = wire(canonicalSerializeAgentPluginPayload(productFixture().alphaPayload));
    root.extra = true;
    expect(verifyAgentPluginPayload(root)).toEqual({
      ok: false,
      issues: [
        {
          code: "UNKNOWN_FIELD",
          path: "payload",
          message: "Expected exactly: entries, manifest, payloadDigest, protocolVersion",
        },
      ],
    });

    for (const [field, missingField, expected] of [
      ["entries", "bytesBase64", "Expected exactly: bytesBase64, mode, path"],
      ["manifest", "byteLength", "Expected exactly: byteLength, contentDigest, mode, path"],
    ] as const) {
      for (const membership of ["missing", "extra"] as const) {
        const candidate = wire(canonicalSerializeAgentPluginPayload(productFixture().alphaPayload));
        if (membership === "missing") {
          delete candidate[field][0][missingField];
        } else {
          candidate[field][0].extra = true;
        }
        expect(verifyAgentPluginPayload(candidate)).toEqual({
          ok: false,
          issues: [
            {
              code: "UNKNOWN_FIELD",
              path: `payload.${field}[0]`,
              message: expected,
            },
          ],
        });
      }
    }
  });

  it("compares ordered manifest fields exactly without mutating either input", () => {
    const base = must(
      createAgentPluginPayload([
        { path: "a", mode: 0o644, bytes: encoder.encode("x") },
        { path: "b", mode: 0o755, bytes: encoder.encode("yy") },
      ])
    ).manifest;
    const alternatePath = must(
      createAgentPluginPayload([{ path: "c", mode: 0o644, bytes: encoder.encode("x") }])
    ).manifest[0]!.path;
    const withFirst = (patch: Partial<PayloadManifestEntry>): readonly PayloadManifestEntry[] =>
      Object.freeze([Object.freeze({ ...base[0]!, ...patch }), base[1]!]);
    const matrix: ReadonlyArray<
      readonly [name: string, candidate: readonly PayloadManifestEntry[], equivalent: boolean]
    > = [
      ["equal", Object.freeze(base.map((entry) => Object.freeze({ ...entry }))), true],
      ["length", Object.freeze(base.slice(0, 1)), false],
      ["order", Object.freeze([...base].reverse()), false],
      ["path", withFirst({ path: alternatePath }), false],
      ["mode", withFirst({ mode: 0o755 }), false],
      ["byteLength", withFirst({ byteLength: base[0]!.byteLength + 1 }), false],
      [
        "contentDigest",
        withFirst({ contentDigest: contentDigest(encoder.encode("changed")) }),
        false,
      ],
    ];
    const snapshots = matrix.map(([, candidate]) => JSON.stringify(candidate));

    for (const [name, candidate, equivalent] of matrix) {
      expect(samePayloadManifest(base, candidate), name).toBe(equivalent);
      expect(samePayloadManifest(candidate, base), `${name} reverse`).toBe(equivalent);
    }
    expect(matrix.map(([, candidate]) => JSON.stringify(candidate))).toEqual(snapshots);
  });

  it("fixes canonical UTF-8 scalar ordering, bytes, identity, and immutable ownership", () => {
    const privateUseBytes = encoder.encode("A\n");
    const supplementaryBytes = encoder.encode("B\n");
    const payload = must(
      createAgentPluginPayload([
        { path: "\u{10000}/b.sh", mode: 0o755, bytes: supplementaryBytes },
        { path: "\uE000/a.txt", mode: 0o644, bytes: privateUseBytes },
      ])
    );
    privateUseBytes.fill(0);
    supplementaryBytes.fill(0);

    const expectedEntryPreimage = encoder.encode(
      '[{"path":"\uE000/a.txt","mode":420,"bytesBase64":"QQo="},{"path":"\u{10000}/b.sh","mode":493,"bytesBase64":"Qgo="}]\n'
    );
    const expectedPayloadBytes = encoder.encode(
      '{"protocolVersion":1,"manifest":[' +
        '{"path":"\uE000/a.txt","mode":420,"byteLength":2,"contentDigest":"sha256_06f961b802bc46ee168555f066d28f4f0e9afdf3f88174c1ee6f9de004fc30a0"},' +
        '{"path":"\u{10000}/b.sh","mode":493,"byteLength":2,"contentDigest":"sha256_c0cde77fa8fef97d476c10aad3d2d54fcc2f336140d073651c2dcccf1e379fd6"}' +
        '],"entries":[' +
        '{"path":"\uE000/a.txt","mode":420,"bytesBase64":"QQo="},' +
        '{"path":"\u{10000}/b.sh","mode":493,"bytesBase64":"Qgo="}' +
        '],"payloadDigest":"pd1_b450dd7709a5a683c8c5159d7c2c11ba0e60ff96c3cf33d5bdecfc30076396ce"}\n'
    );

    expect(payload.entries.map(({ path }) => path)).toEqual(["\uE000/a.txt", "\u{10000}/b.sh"]);
    expect(canonicalSerializePayloadEntries(payload.entries)).toEqual(expectedEntryPreimage);
    expect(payload.payloadDigest).toBe(
      "pd1_b450dd7709a5a683c8c5159d7c2c11ba0e60ff96c3cf33d5bdecfc30076396ce"
    );
    expect(canonicalSerializeAgentPluginPayload(payload)).toEqual(expectedPayloadBytes);

    expect(Object.isFrozen(payload)).toBe(true);
    expect(Object.isFrozen(payload.entries)).toBe(true);
    expect(Object.isFrozen(payload.manifest)).toBe(true);
    expect(payload.entries.every((entry) => Object.isFrozen(entry))).toBe(true);
    expect(payload.manifest.every((entry) => Object.isFrozen(entry))).toBe(true);

    const decoded = payloadEntryBytes(payload.entries[0]!);
    expect(decoded).toEqual(Uint8Array.of(0x41, 0x0a));
    decoded.fill(0);
    expect(payloadEntryBytes(payload.entries[0]!)).toEqual(Uint8Array.of(0x41, 0x0a));
    expect(payloadEntryBytes(payload.entries[1]!)).toEqual(Uint8Array.of(0x42, 0x0a));
  });

  it("bounds traversal before excluded getters and reports every adjacent duplicate", () => {
    const overLimit = Array.from({ length: MAX_PAYLOAD_ENTRIES_PER_MEMBER + 1 }, (_, index) => ({
      path: `files/${index}`,
      mode: 0o644,
      bytes: new Uint8Array(),
    }));
    let excludedRead = false;
    Object.defineProperty(overLimit, MAX_PAYLOAD_ENTRIES_PER_MEMBER, {
      get() {
        excludedRead = true;
        throw new Error("excluded payload entry was read");
      },
    });

    const bounded = createAgentPluginPayload(overLimit);
    expect(excludedRead).toBe(false);
    expect(bounded).toEqual({
      ok: false,
      issues: [
        {
          code: "COUNT_LIMIT_EXCEEDED",
          path: "payload.entries",
          message: `Array exceeds protocol limit ${MAX_PAYLOAD_ENTRIES_PER_MEMBER}`,
          expected: MAX_PAYLOAD_ENTRIES_PER_MEMBER,
          actual: MAX_PAYLOAD_ENTRIES_PER_MEMBER + 1,
        },
      ],
    });

    const duplicates = createAgentPluginPayload([
      { path: "same", mode: 0o644, bytes: new Uint8Array() },
      { path: "same", mode: 0o644, bytes: new Uint8Array() },
      { path: "same", mode: 0o644, bytes: new Uint8Array() },
    ]);
    expect(duplicates).toEqual({
      ok: false,
      issues: [
        {
          code: "DUPLICATE_PAYLOAD_PATH",
          path: "payload.entries",
          message: "Duplicate payload path: same",
        },
        {
          code: "DUPLICATE_PAYLOAD_PATH",
          path: "payload.entries",
          message: "Duplicate payload path: same",
        },
      ],
    });
  });

  it("bounds wire entries and manifests before child schema admission", () => {
    const emptyBytes = new Uint8Array();
    const emptyDigest = contentDigest(emptyBytes);
    const entries = Array.from({ length: MAX_PAYLOAD_ENTRIES_PER_MEMBER + 1 }, (_, index) => ({
      path: `files/${index}`,
      mode: 0o644,
      bytesBase64: "",
    }));
    const manifest = entries.map(({ path, mode }) => ({
      path,
      mode,
      byteLength: 0,
      contentDigest: emptyDigest,
    }));
    let excludedEntryRead = false;
    let excludedManifestRead = false;
    Object.defineProperty(entries, MAX_PAYLOAD_ENTRIES_PER_MEMBER, {
      get() {
        excludedEntryRead = true;
        throw new Error("excluded wire entry was read");
      },
    });
    Object.defineProperty(manifest, MAX_PAYLOAD_ENTRIES_PER_MEMBER, {
      get() {
        excludedManifestRead = true;
        throw new Error("excluded manifest entry was read");
      },
    });
    const payloadWire = wire(canonicalSerializeAgentPluginPayload(productFixture().alphaPayload));
    payloadWire.entries = entries;
    payloadWire.manifest = manifest;

    const bounded = verifyAgentPluginPayload(payloadWire);

    expect(excludedEntryRead).toBe(false);
    expect(excludedManifestRead).toBe(false);
    expect(bounded.ok).toBe(false);
    if (!bounded.ok) {
      expect(bounded.issues.filter(({ code }) => code === "COUNT_LIMIT_EXCEEDED")).toEqual([
        {
          code: "COUNT_LIMIT_EXCEEDED",
          path: "payload.entries",
          message: `Array exceeds protocol limit ${MAX_PAYLOAD_ENTRIES_PER_MEMBER}`,
          expected: MAX_PAYLOAD_ENTRIES_PER_MEMBER,
          actual: MAX_PAYLOAD_ENTRIES_PER_MEMBER + 1,
        },
        {
          code: "COUNT_LIMIT_EXCEEDED",
          path: "payload.manifest",
          message: `Array exceeds protocol limit ${MAX_PAYLOAD_ENTRIES_PER_MEMBER}`,
          expected: MAX_PAYLOAD_ENTRIES_PER_MEMBER,
          actual: MAX_PAYLOAD_ENTRIES_PER_MEMBER + 1,
        },
      ]);
    }
  });
});
