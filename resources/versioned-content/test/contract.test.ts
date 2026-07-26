import { describe, expect, test } from "bun:test";
import type { Static } from "typebox";
import Schema from "typebox/schema";

import {
  AncestryInputSchema,
  isVersionedContentFailure,
  MAX_VERSIONED_CONTENT_BYTES,
  MAX_VERSIONED_CONTENT_ENTRIES,
  MAX_VERSIONED_CONTENT_FAILURE_DETAIL,
  type MaterializedRemoteContentTree,
  MaterializedRemoteContentTreeSchema,
  type MaterializedVersionedContentTreeEntry,
  MaterializeRemoteInputSchema,
  type ObserveRemoteInput,
  ObserveRemoteInputSchema,
  type RemoteContentTree,
  RemoteContentTreeSchema,
  type VersionedContentFailure,
  VersionedContentFailureSchema,
  type VersionedContentTreeEntry,
  VersionedContentTreeEntrySchema,
} from "../contract";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? true
    : false;
type Expect<Value extends true> = Value;

export type RemoteContentTreeComesFromTypeBox = Expect<
  Equal<RemoteContentTree, Static<typeof RemoteContentTreeSchema>>
>;
export type MaterializedRemoteContentTreeComesFromTypeBox = Expect<
  Equal<MaterializedRemoteContentTree, Static<typeof MaterializedRemoteContentTreeSchema>>
>;
export type VersionedContentFailureComesFromTypeBox = Expect<
  Equal<VersionedContentFailure, Static<typeof VersionedContentFailureSchema>>
>;
export type ObserveRemoteInputPropertiesAreReadonly = Expect<
  Equal<Pick<ObserveRemoteInput, "refName">, Readonly<Pick<ObserveRemoteInput, "refName">>>
>;
export type RemoteContentTreeEntriesAreReadonly = Expect<
  Equal<RemoteContentTree["entries"], readonly Static<typeof VersionedContentTreeEntrySchema>[]>
>;
export type VersionedContentEntryNamesAreOwnerQualified = Expect<
  Equal<RemoteContentTree["entries"], readonly VersionedContentTreeEntry[]>
>;
export type MaterializedVersionedContentEntryCarriesBytes = Expect<
  Equal<
    MaterializedVersionedContentTree["entries"],
    readonly MaterializedVersionedContentTreeEntry[]
  >
>;

const sha1 = "0123456789abcdef0123456789abcdef01234567";
const sha256 = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const observeRemoteInputValidator = Schema.Compile(ObserveRemoteInputSchema);
const materializeRemoteInputValidator = Schema.Compile(MaterializeRemoteInputSchema);
const ancestryInputValidator = Schema.Compile(AncestryInputSchema);
const remoteContentTreeValidator = Schema.Compile(RemoteContentTreeSchema);
const materializedRemoteContentTreeValidator = Schema.Compile(MaterializedRemoteContentTreeSchema);

const observation: RemoteContentTree = Object.freeze({
  repositoryIdentity: "https://example.test/content.git",
  refName: "refs/heads/main",
  sourcePath: "plugins/example",
  commit: sha1,
  tree: sha1,
  objectFormat: "sha1",
  entries: Object.freeze([
    Object.freeze({
      path: "README.md",
      mode: "100644",
      blob: sha1,
    }),
  ]),
});

describe("versioned-content contract", () => {
  test("owns closed bounded operation inputs in TypeBox", () => {
    expect(
      observeRemoteInputValidator.Check({
        repositoryIdentity: "https://example.test/content.git",
        refName: "refs/heads/main",
        sourcePath: "",
        maxEntries: MAX_VERSIONED_CONTENT_ENTRIES,
      })
    ).toBe(true);
    expect(
      materializeRemoteInputValidator.Check({
        repositoryIdentity: "https://example.test/content.git",
        refName: "refs/heads/main",
        sourcePath: "plugins/example",
        maxEntries: 1,
        maxBytes: MAX_VERSIONED_CONTENT_BYTES,
      })
    ).toBe(true);
    expect(
      ancestryInputValidator.Check({
        repositoryIdentity: "https://example.test/content.git",
        refName: "refs/heads/main",
        ancestorCommit: sha1,
        descendantCommit: sha1,
      })
    ).toBe(true);

    for (const candidate of [
      {
        repositoryIdentity: "https://example.test/content.git",
        refName: "refs/heads/main",
        sourcePath: "",
        maxEntries: 0,
      },
      {
        repositoryIdentity: "https://example.test/content.git",
        refName: "refs/heads/main",
        sourcePath: "",
        maxEntries: MAX_VERSIONED_CONTENT_ENTRIES + 1,
      },
      {
        repositoryIdentity: "https://example.test/content.git",
        refName: "refs/heads/main",
        sourcePath: "",
        maxEntries: 1,
        unexpected: true,
      },
      {
        repositoryIdentity: "https://example.test/content.git",
        refName: "main",
        sourcePath: "",
        maxEntries: 1,
      },
      {
        repositoryIdentity: "https://example.test/content.git",
        refName: "refs/heads/main",
        sourcePath: "../plugins/example",
        maxEntries: 1,
      },
    ]) {
      expect(observeRemoteInputValidator.Check(candidate)).toBe(false);
    }
    expect(
      materializeRemoteInputValidator.Check({
        repositoryIdentity: "https://example.test/content.git",
        refName: "refs/heads/main",
        sourcePath: "",
        maxEntries: 1,
        maxBytes: MAX_VERSIONED_CONTENT_BYTES + 1,
      })
    ).toBe(false);
  });

  test("validates exact observation and materialization structures", () => {
    expect(remoteContentTreeValidator.Check(observation)).toBe(true);
    expect(
      materializedRemoteContentTreeValidator.Check({
        ...observation,
        entries: [{ ...observation.entries[0], bytes: new Uint8Array([1, 2, 3]) }],
      })
    ).toBe(true);
    expect(
      materializedRemoteContentTreeValidator.Check({
        ...observation,
        entries: [{ ...observation.entries[0], bytes: [1, 2, 3] }],
      })
    ).toBe(false);
    expect(
      remoteContentTreeValidator.Check({
        ...observation,
        entries: [{ ...observation.entries[0], executable: false }],
      })
    ).toBe(false);
  });

  test("leaves canonical ordering and object-format identity coupling to providers", () => {
    expect(
      remoteContentTreeValidator.Check({
        ...observation,
        tree: sha256,
        entries: [
          { path: "z", mode: "100644", blob: sha1 },
          { path: "a", mode: "100644", blob: sha256 },
          { path: "a", mode: "100644", blob: sha1 },
        ],
      })
    ).toBe(true);
  });

  test("recognizes only complete bounded typed failures", () => {
    const failure: VersionedContentFailure = Object.freeze({
      _tag: "VersionedContentFailure",
      operation: "observe-remote",
      reason: "CommandFailed",
      detail: "Git fetch exited 128",
    });
    expect(isVersionedContentFailure(failure)).toBe(true);
    for (const candidate of [
      { ...failure, reason: "GitFailed" },
      { ...failure, operation: "publish" },
      { ...failure, retryable: true },
      { ...failure, detail: "" },
      { ...failure, detail: "x".repeat(MAX_VERSIONED_CONTENT_FAILURE_DETAIL + 1) },
    ]) {
      expect(isVersionedContentFailure(candidate)).toBe(false);
    }
  });
});
