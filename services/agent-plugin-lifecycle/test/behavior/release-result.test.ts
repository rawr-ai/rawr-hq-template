import { describe, expect, expectTypeOf, it } from "vitest";

import type { ReleaseResult } from "../../src/service/model/dto/release-result";
import {
  asNonEmpty,
  collectReleaseResult,
  failure,
  success,
} from "../../src/service/model/policy/release-result";

describe("release result model", () => {
  it("preserves the successful value and the plain discriminated shape", () => {
    const value = { pluginId: "alpha" };
    const result = success(value);

    expect(result).toEqual({ ok: true, value });
    expectTypeOf(result).toEqualTypeOf<ReleaseResult<typeof value, never>>();
    if (!result.ok) throw new Error("Expected successful release result");
    expect(result.value).toBe(value);
    expect(Object.keys(result)).toEqual(["ok", "value"]);
    expect(Object.isFrozen(result)).toBe(false);
  });

  it("preserves ordered nonempty issues and the plain discriminated shape", () => {
    const issues = ["first", "second"] as const;
    const result = failure(issues);

    expect(result).toEqual({ ok: false, issues: ["first", "second"] });
    expectTypeOf(result).toEqualTypeOf<ReleaseResult<never, "first" | "second">>();
    if (result.ok) throw new Error("Expected failed release result");
    expect(result.issues).toBe(issues);
    expect(Object.keys(result)).toEqual(["ok", "issues"]);
    expect(Object.isFrozen(result)).toBe(false);
    expect(Object.isFrozen(result.issues)).toBe(false);
  });

  it("narrows only nonempty issue collections without copying or reordering", () => {
    const issues = ["first", "second"];
    const narrowed = asNonEmpty(issues);

    expect(asNonEmpty([])).toBeUndefined();
    expect(narrowed).toBe(issues);
    expect(narrowed).toEqual(["first", "second"]);
  });

  it("collects a successful value or appends failed issues by identity and order", () => {
    const value = { pluginId: "alpha" };
    const existing = { code: "existing" };
    const first = { code: "first" };
    const second = { code: "second" };
    const issues = [existing];
    const succeeded: ReleaseResult<typeof value, { code: string }> = success(value);
    const failed = failure([first, second] as const);

    expect(collectReleaseResult(succeeded, issues)).toBe(value);
    expect(issues).toEqual([existing]);
    expect(collectReleaseResult(failed, issues)).toBeUndefined();
    expect(issues).toEqual([existing, first, second]);
    expect(issues[1]).toBe(first);
    expect(issues[2]).toBe(second);
  });

  it("makes empty failure diagnostics unrepresentable", () => {
    // @ts-expect-error Failed release computations always carry at least one issue.
    const invalid: ReleaseResult<never, string> = { ok: false, issues: [] };
    if (invalid.ok) throw new Error("Expected failed release result");
    expect(invalid.issues).toEqual([]);
  });
});
