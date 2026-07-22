import { describe, expect, test } from "vitest";
import {
  classifyAdoption,
  classifyPublication,
  equalStructuredData,
  reconcilePublicationAfterUnknown,
  stageOutputKeyOf,
} from "../src/core/index.js";
import { digestIdentity, stageOutput, stageOutputKey } from "./fixtures.js";

const digestValue = (value: { readonly answer: number }) =>
  digestIdentity("research-sdk.stage-value.v1", value);

describe("durable output adoption", () => {
  test("adopts only an exact identity with an independently verified value digest", () => {
    const output = stageOutput({ answer: 42 });

    expect(
      classifyAdoption(stageOutputKeyOf(output), { kind: "Found", value: output }, digestValue)
    ).toEqual({ kind: "Adopted", value: output });

    expect(
      classifyAdoption(
        { ...stageOutputKey(), implementationRevision: "sdk-2" },
        { kind: "Found", value: output },
        digestValue
      )
    ).toEqual({
      kind: "Conflict",
      conflict: { kind: "IdentityMismatch" },
    });

    const corrupt = { ...output, value: { answer: 7 } };
    expect(
      classifyAdoption(stageOutputKeyOf(output), { kind: "Found", value: corrupt }, digestValue)
    ).toEqual({
      kind: "Conflict",
      conflict: { kind: "StoredOutputDigestMismatch" },
    });
  });

  test("classifies create-if-absent and commit-before-ack outcomes", () => {
    const candidate = stageOutput({ answer: 42 });

    expect(classifyPublication(candidate, { kind: "Created" }, digestValue)).toEqual({
      kind: "Published",
      value: candidate,
    });
    expect(
      classifyPublication(candidate, { kind: "Existing", value: candidate }, digestValue)
    ).toEqual({ kind: "Adopted", value: candidate });
    expect(
      classifyPublication(
        candidate,
        { kind: "Unknown", uncertainty: { operationId: "write-1" } },
        digestValue
      )
    ).toEqual({
      kind: "ReadAfterUnknown",
      uncertainty: { operationId: "write-1" },
    });
    expect(reconcilePublicationAfterUnknown(candidate, { kind: "Absent" }, digestValue)).toEqual({
      kind: "RetryPermitted",
    });
  });

  test("rejects a divergent value already published under the same key", () => {
    const candidate = stageOutput({ answer: 42 });
    const existing = stageOutput({ answer: 7 });

    expect(
      classifyPublication(candidate, { kind: "Existing", value: existing }, digestValue)
    ).toEqual({
      kind: "Conflict",
      conflict: { kind: "DivergentExistingOutput" },
    });
  });

  test("fails closed instead of ignoring symbol-keyed durable data", () => {
    const hidden = Symbol("hidden");
    const left = { visible: 1, [hidden]: "left" };
    const right = { visible: 1, [hidden]: "right" };

    expect(equalStructuredData(left, right)).toBe(false);
    expect(equalStructuredData(left, left)).toBe(false);
  });
});
