import type { Static } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  MAX_PROVENANCE_BINDINGS,
  type ProvenanceBinding,
  ProvenanceBindingSchema,
} from "../../src/service/model/dto/release-input";
import type { ReleaseIssue, ReleaseIssueCode } from "../../src/service/model/dto/release-issue";
import {
  parseProvenanceBindings,
  provenanceBindingValue,
} from "../../src/service/model/policy/provenance-binding";
import { contentDigest } from "../../src/service/model/policy/release-digest";
import { releaseIssue } from "../../src/service/model/policy/release-issue";

const encoder = new TextEncoder();

describe("provenance binding policy", () => {
  it("derives the closed binding type from its owner schema", () => {
    expectTypeOf<ProvenanceBinding>().toEqualTypeOf<Static<typeof ProvenanceBindingSchema>>();

    const binding = {
      id: "binding",
      protocol: "vendor-v1",
      contentDigest: digest("binding"),
    };
    expect(Value.Check(ProvenanceBindingSchema, binding)).toBe(true);
    expect(Value.Check(ProvenanceBindingSchema, { ...binding, extra: true })).toBe(false);
    expect(
      Value.Check(ProvenanceBindingSchema, { id: binding.id, protocol: binding.protocol })
    ).toBe(false);
  });

  it("canonically orders, defensively freezes, and projects admitted bindings", () => {
    const seed = releaseIssue("INVALID_STRING", "seed", "Seed diagnostic");
    const issues = [seed];
    const input = [
      {
        id: "zeta",
        protocol: "vendor-v2",
        contentDigest: digest("zeta"),
      },
      {
        id: "alpha",
        protocol: "vendor-v1",
        contentDigest: digest("alpha"),
      },
    ];

    const bindings = parseProvenanceBindings(input, "bindings", issues);

    expect(issues).toEqual([seed]);
    expect(issues[0]).toBe(seed);
    expect(bindings?.map((binding) => binding.id)).toEqual(["alpha", "zeta"]);
    expect(Object.isFrozen(bindings)).toBe(true);
    expect(bindings?.every(Object.isFrozen)).toBe(true);
    expect(JSON.stringify(bindings?.map((binding) => provenanceBindingValue(binding)))).toBe(
      JSON.stringify([
        {
          id: "alpha",
          protocol: "vendor-v1",
          contentDigest: digest("alpha"),
        },
        {
          id: "zeta",
          protocol: "vendor-v2",
          contentDigest: digest("zeta"),
        },
      ])
    );

    input[0]!.id = "changed";
    expect(bindings?.map((binding) => binding.id)).toEqual(["alpha", "zeta"]);

    const empty = parseProvenanceBindings([], "bindings", []);
    expect(empty).toEqual([]);
    expect(Object.isFrozen(empty)).toBe(true);
  });

  it("rejects duplicate identities independently of declaration order", () => {
    const input = [
      {
        id: "duplicate",
        protocol: "vendor-v2",
        contentDigest: digest("second"),
      },
      {
        id: "duplicate",
        protocol: "vendor-v1",
        contentDigest: digest("first"),
      },
    ];
    const leftIssues: ReleaseIssue[] = [];
    const rightIssues: ReleaseIssue[] = [];

    const left = parseProvenanceBindings(input, "bindings", leftIssues);
    const right = parseProvenanceBindings([...input].reverse(), "bindings", rightIssues);

    expect(right).toEqual(left);
    expect(rightIssues).toEqual(leftIssues);
    expect(leftIssues).toEqual([
      releaseIssue("DUPLICATE_VALUE", "bindings", "Duplicate provenance binding: duplicate"),
    ]);
  });

  it("admits the exact collection bound and refuses overflow without reading its tail", () => {
    const input = Array.from({ length: MAX_PROVENANCE_BINDINGS }, (_, index) => ({
      id: `binding-${index.toString().padStart(5, "0")}`,
      protocol: "vendor-v1",
      contentDigest: digest("shared"),
    }));
    const atLimitIssues: ReleaseIssue[] = [];
    const atLimit = parseProvenanceBindings(input, "bindings", atLimitIssues);

    expect(atLimitIssues).toEqual([]);
    expect(atLimit).toHaveLength(MAX_PROVENANCE_BINDINGS);

    const overflow = [...input];
    Object.defineProperty(overflow, MAX_PROVENANCE_BINDINGS, {
      configurable: true,
      get: () => {
        throw new Error("bounded admission must not read overflow");
      },
    });
    const overflowIssues: ReleaseIssue[] = [];
    const bounded = parseProvenanceBindings(overflow, "bindings", overflowIssues);

    expect(bounded).toHaveLength(MAX_PROVENANCE_BINDINGS);
    expect(overflowIssues).toEqual([
      releaseIssue(
        "COUNT_LIMIT_EXCEEDED",
        "bindings",
        `Array exceeds protocol limit ${MAX_PROVENANCE_BINDINGS}`,
        {
          expected: MAX_PROVENANCE_BINDINGS,
          actual: MAX_PROVENANCE_BINDINGS + 1,
        }
      ),
    ]);
  });

  it("retains the established raw-admission diagnostic vocabulary", () => {
    const cases: Array<readonly [string, unknown, readonly ReleaseIssueCode[]]> = [
      ["container", {}, ["EXPECTED_ARRAY"]],
      ["entry", [null], ["EXPECTED_OBJECT"]],
      [
        "unknown field",
        [
          {
            id: "binding",
            protocol: "vendor-v1",
            contentDigest: digest("binding"),
            unexpected: true,
          },
        ],
        ["UNKNOWN_FIELD"],
      ],
      [
        "identity",
        [{ id: "../binding", protocol: "vendor-v1", contentDigest: digest("binding") }],
        ["INVALID_OWNERSHIP_IDENTITY"],
      ],
      [
        "protocol",
        [{ id: "binding", protocol: "Vendor", contentDigest: digest("binding") }],
        ["INVALID_STRING"],
      ],
      [
        "digest",
        [{ id: "binding", protocol: "vendor-v1", contentDigest: "not-a-digest" }],
        ["INVALID_DIGEST"],
      ],
    ];

    for (const [name, input, expected] of cases) {
      const issues: ReleaseIssue[] = [];
      parseProvenanceBindings(input, "bindings", issues);
      expect(
        issues.map((entry) => entry.code),
        name
      ).toEqual(expected);
    }
  });

  it("uses the owner schema for exact aggregate diagnostics and incomplete collections", () => {
    const binding = {
      id: "binding",
      protocol: "vendor-v1",
      contentDigest: digest("binding"),
    };
    for (const candidate of [
      { id: binding.id, protocol: binding.protocol },
      { ...binding, extra: true },
    ]) {
      const issues: ReleaseIssue[] = [];

      expect(parseProvenanceBindings([candidate], "bindings", issues)).toBeUndefined();
      expect(issues).toEqual([
        releaseIssue(
          "UNKNOWN_FIELD",
          "bindings[0]",
          "Expected exactly: contentDigest, id, protocol"
        ),
      ]);
    }

    const issues: ReleaseIssue[] = [];
    expect(parseProvenanceBindings([null], "bindings", issues)).toBeUndefined();
    expect(issues).toEqual([
      releaseIssue("EXPECTED_OBJECT", "bindings[0]", "Value must be an object"),
    ]);
  });

  it("retains primitive diagnostic order for exact-shape invalid bindings", () => {
    const issues: ReleaseIssue[] = [];

    expect(
      parseProvenanceBindings(
        [
          {
            id: "../binding",
            protocol: "Vendor",
            contentDigest: "not-a-digest",
          },
        ],
        "bindings",
        issues
      )
    ).toEqual([]);
    expect(issues).toEqual([
      releaseIssue("INVALID_OWNERSHIP_IDENTITY", "bindings[0].id", "Invalid ownership identity"),
      releaseIssue(
        "INVALID_STRING",
        "bindings[0].protocol",
        "Value must be canonical UTF-8 between 1 and 512 bytes"
      ),
      releaseIssue(
        "INVALID_DIGEST",
        "bindings[0].contentDigest",
        "Digest has the wrong domain or encoding"
      ),
    ]);
  });
});

function digest(value: string) {
  return contentDigest(encoder.encode(value));
}
