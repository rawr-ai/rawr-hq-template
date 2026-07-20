import { describe, expect, it } from "bun:test";
import type { Static } from "typebox";

import {
  isNativeAgentProviderFailure,
  NativeAgentProviderFailureSchema,
  type NativeAgentProviderFailure,
} from "../contract";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2)
    ? true
    : false;
type Expect<Value extends true> = Value;
export type NativeProviderFailureComesFromTypeBox = Expect<Equal<
  NativeAgentProviderFailure,
  Static<typeof NativeAgentProviderFailureSchema>
>>;

const ownershipConflict: NativeAgentProviderFailure = Object.freeze({
  _tag: "NativeAgentProviderFailure",
  provider: "codex",
  operation: "acquire",
  reason: "OwnershipConflict",
  path: "/tmp/rawr-native-home/.rawr-agent-plugin-owner.json",
  detail: "Provider ownership slot is occupied",
});

describe("native provider failure contract", () => {
  it("recognizes the complete owner-defined failure", () => {
    expect(isNativeAgentProviderFailure(ownershipConflict)).toBe(true);
  });

  it.each([
    ["provider", { ...ownershipConflict, provider: "other" }],
    ["operation", { ...ownershipConflict, operation: "plugin-repair" }],
    ["reason", { ...ownershipConflict, reason: "Unknown" }],
    ["detail", { ...ownershipConflict, detail: 42 }],
    ["path", { ...ownershipConflict, path: 42 }],
    ["surplus property", { ...ownershipConflict, retryable: true }],
  ] as const)("rejects an invalid %s", (_field, input) => {
    expect(isNativeAgentProviderFailure(input)).toBe(false);
  });
});
