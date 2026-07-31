import { describe, expect, test } from "bun:test";
import type { Static } from "typebox";
import { Validator } from "typebox/schema";

import {
  isSourceInventoryFailure,
  MAX_SOURCE_INVENTORY_ENTRIES,
  MAX_SOURCE_INVENTORY_FAILURE_DETAIL,
  type ObserveSourceInventoryInput,
  ObserveSourceInventoryInputSchema,
  type SourceInventoryFailure,
  SourceInventoryFailureSchema,
  type SourceInventoryResult,
  SourceInventoryResultSchema,
} from "../contract";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? true
    : false;
type Expect<Value extends true> = Value;

const inputComesFromTypeBox: Expect<
  Equal<ObserveSourceInventoryInput, Static<typeof ObserveSourceInventoryInputSchema>>
> = true;
const resultComesFromTypeBox: Expect<
  Equal<SourceInventoryResult, Static<typeof SourceInventoryResultSchema>>
> = true;
const failureComesFromTypeBox: Expect<
  Equal<SourceInventoryFailure, Static<typeof SourceInventoryFailureSchema>>
> = true;

const inputValidator = new Validator({}, ObserveSourceInventoryInputSchema);
const resultValidator = new Validator({}, SourceInventoryResultSchema);

describe("source-inventory contract", () => {
  test("derives its complete public values from TypeBox schemas", () => {
    expect([inputComesFromTypeBox, resultComesFromTypeBox, failureComesFromTypeBox]).toEqual([
      true,
      true,
      true,
    ]);
  });

  test("admits one closed bounded observation input", () => {
    expect(inputValidator.Check({ root: "/workspace", maxEntries: 100 })).toBe(true);
    for (const candidate of [
      { root: "", maxEntries: 100 },
      { root: "/workspace", maxEntries: 0 },
      { root: "/workspace", maxEntries: MAX_SOURCE_INVENTORY_ENTRIES + 1 },
      { root: "/workspace", maxEntries: 100, includeIgnored: true },
    ]) {
      expect(inputValidator.Check(candidate)).toBe(false);
    }
  });

  test("admits only canonical inventories with a tracked non-file subset", () => {
    expect(resultValidator.Check({ paths: [], trackedNonFilePaths: [] })).toBe(true);
    expect(
      resultValidator.Check({
        paths: [".gitignore", "plugins/example/index.ts", "plugins/example/link"],
        trackedNonFilePaths: ["plugins/example/link"],
      })
    ).toBe(true);

    for (const candidate of [
      { paths: ["z", "a"], trackedNonFilePaths: [] },
      { paths: ["a", "a"], trackedNonFilePaths: [] },
      { paths: ["../outside"], trackedNonFilePaths: [] },
      { paths: ["a"], trackedNonFilePaths: ["b"] },
      { paths: ["a"], trackedNonFilePaths: [], eagerKinds: [] },
    ]) {
      expect(resultValidator.Check(candidate)).toBe(false);
    }
  });

  test("recognizes only complete bounded typed failures", () => {
    const failure: SourceInventoryFailure = Object.freeze({
      _tag: "SourceInventoryFailure",
      reason: "CommandFailed",
      path: "/workspace",
      detail: "Git ls-files exited 128",
    });
    expect(isSourceInventoryFailure(failure)).toBe(true);
    expect(isSourceInventoryFailure({ ...failure, reason: "SetupFailed" })).toBe(true);
    for (const candidate of [
      { ...failure, reason: "GitFailed" },
      { ...failure, retryable: true },
      { ...failure, detail: "" },
      { ...failure, detail: "x".repeat(MAX_SOURCE_INVENTORY_FAILURE_DETAIL + 1) },
    ]) {
      expect(isSourceInventoryFailure(candidate)).toBe(false);
    }
  });
});
