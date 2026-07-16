import { describe, expect, it } from "vitest";

import {
  CONTROLLER_SELECTION_BYTES,
  createControllerSelection,
  decodeControllerSelection,
  encodeControllerSelection,
  planControllerSelection,
} from "../src";
import { DIGEST_A, DIGEST_B } from "./fixtures";

describe("controller selection", () => {
  it("encodes one selected digest as exactly 64 lowercase hex bytes plus LF", () => {
    const selection = createControllerSelection(DIGEST_A);
    expect(selection.ok).toBe(true);
    if (!selection.ok) return;

    const bytes = encodeControllerSelection(selection.value);
    expect(bytes).toHaveLength(CONTROLLER_SELECTION_BYTES);
    expect(new TextDecoder().decode(bytes)).toBe(`${DIGEST_A}\n`);
    expect(decodeControllerSelection(bytes)).toEqual(selection);
  });

  it.each([
    new TextEncoder().encode(DIGEST_A),
    new TextEncoder().encode(`${DIGEST_A}\nextra`),
    new TextEncoder().encode(`${DIGEST_A.toUpperCase()}\n`),
    new TextEncoder().encode(`${DIGEST_A} `),
  ])("rejects noncanonical selected-controller bytes", (bytes) => {
    expect(decodeControllerSelection(bytes).ok).toBe(false);
  });

  it("classifies a repeated selection as converged without proposing replacement", () => {
    const selection = createControllerSelection(DIGEST_A);
    expect(selection.ok).toBe(true);
    if (!selection.ok) return;

    const current = encodeControllerSelection(selection.value);
    const first = planControllerSelection(current, selection.value);
    const second = planControllerSelection(current, selection.value);

    expect(first).toMatchObject({ kind: "converged", selection: { controllerDigest: DIGEST_A } });
    expect(second).toEqual(first);
    expect(current).toEqual(encodeControllerSelection(selection.value));
  });

  it("makes missing, invalid, and different selection replacement explicit", () => {
    const candidate = createControllerSelection(DIGEST_B);
    const current = createControllerSelection(DIGEST_A);
    expect(candidate.ok && current.ok).toBe(true);
    if (!candidate.ok || !current.ok) return;

    expect(planControllerSelection(undefined, candidate.value)).toMatchObject({ kind: "replace", reason: "missing" });
    expect(planControllerSelection(new Uint8Array([1, 2, 3]), candidate.value)).toMatchObject({
      kind: "replace",
      reason: "invalid",
      currentIssues: [{ code: "INVALID_SELECTION_LENGTH" }],
    });
    expect(planControllerSelection(encodeControllerSelection(current.value), candidate.value)).toMatchObject({
      kind: "replace",
      reason: "different",
      current: { controllerDigest: DIGEST_A },
      selection: { controllerDigest: DIGEST_B },
    });
  });
});
