import { posix } from "node:path";
import {
  type Client,
  MAX_CURRENT_MAIN_RECORD_BYTES,
  MAX_RELEASE_INPUT_ENVELOPE_BYTES,
  parseContentAuthority,
  parseCurrentMainRecordInput,
  parseGitCommitId,
  parseGitTreeId,
  parsePluginId,
  parseReleaseRelativePath,
  parseRepositoryIdentity,
} from "@habitat-ai/agent-plugin-lifecycle-service/client";
import { Flags } from "@oclif/core";

function scalar(parse: (value: unknown) => string | undefined) {
  return Flags.custom<string>({
    allowStdin: false,
    async parse(value) {
      const admitted = parse(value);
      if (admitted === undefined) throw new Error("Expected a canonical value.");
      return admitted;
    },
  });
}

/** Native scalar parsers reuse the service's intentional public admission helpers. */
export const pluginFlag = scalar(parsePluginId);
/** Native text transport is bounded but does not replace service domain validation. */
export const textFlag = scalar((value) =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= 16_384 &&
  !/[\u0000-\u001f\u007f]/u.test(value)
    ? value
    : undefined
);
/** Rejects relative or normalized-away path input without discovering any filesystem state. */
export const absolutePathFlag = scalar(absolutePath);

function absolutePath(value: unknown): string | undefined {
  return typeof value === "string" &&
    value.length > 1 &&
    value.length <= 16_384 &&
    posix.isAbsolute(value) &&
    posix.normalize(value) === value &&
    !value.endsWith("/") &&
    !/[\\\u0000-\u001f\u007f]/u.test(value)
    ? value
    : undefined;
}

/** Common explicit source values; commands select only their applicable fields. */
export const workspaceFlags = {
  "content-workspace": absolutePathFlag({ description: "Absolute content workspace" }),
  "repository-identity": scalar(parseRepositoryIdentity)({
    description: "Expected repository identity",
  }),
  "content-authority": scalar(parseContentAuthority)({ description: "Declared content authority" }),
  "remote-name": textFlag({ description: "Expected Git remote name" }),
  "remote-url": textFlag({ description: "Expected Git remote URL" }),
  ref: textFlag({ description: "Qualified Git branch ref" }),
  "source-commit": scalar(parseGitCommitId)({ description: "Exact Git commit" }),
  "source-tree": scalar(parseGitTreeId)({ description: "Exact Git tree" }),
  "release-input": scalar(parseReleaseRelativePath)({
    description: "Repository-relative release input",
  }),
  "plugin-root": scalar(parseReleaseRelativePath)({
    description: "Repository-relative plugin root",
  }),
};

/** Required source fields for release and packaging operations. */
export const cleanFlags: {
  readonly [K in keyof typeof workspaceFlags]: (typeof workspaceFlags)[K];
} = {
  "content-workspace": { ...workspaceFlags["content-workspace"], required: true },
  "repository-identity": { ...workspaceFlags["repository-identity"], required: true },
  "content-authority": { ...workspaceFlags["content-authority"], required: true },
  "remote-name": { ...workspaceFlags["remote-name"], required: true },
  "remote-url": { ...workspaceFlags["remote-url"], required: true },
  ref: { ...workspaceFlags.ref, required: true },
  "source-commit": { ...workspaceFlags["source-commit"], required: true },
  "source-tree": { ...workspaceFlags["source-tree"], required: true },
  "release-input": { ...workspaceFlags["release-input"], required: true },
  "plugin-root": { ...workspaceFlags["plugin-root"], required: true },
} as const;

/** Native mutually exclusive release selectors preserve the service's discriminated union. */
export const releaseFlags = {
  plugin: pluginFlag({ exactlyOne: ["plugin", "complete-set"] }),
  "complete-set": Flags.boolean({ exactlyOne: ["plugin", "complete-set"] }),
};

type Target = Parameters<Client["providers"]["status"]>[0]["targets"][number];
/** One tuple parser; aggregate target uniqueness and home policy remain service-owned. */
export const targetFlag = Flags.custom<Target>({
  allowStdin: false,
  async parse(value) {
    const separator = value.indexOf("=");
    const provider = value.slice(0, separator);
    const home = value.slice(separator + 1);
    if (separator < 1 || (provider !== "codex" && provider !== "claude"))
      throw new Error("Expected provider=absolute-home with codex or claude.");
    const parsedHome = absolutePath(home);
    if (parsedHome === undefined) throw new Error("Expected an absolute provider home.");
    return { provider, home: parsedHome };
  },
});

/** Status and sync accept only an explicit fixed channel, locator and provider homes. */
export const channelFlags = {
  json: Flags.boolean(),
  channel: Flags.option({
    required: true,
    options: ["current-main"] as const,
    allowStdin: false,
  })(),
  "content-workspace": cleanFlags["content-workspace"],
  "repository-identity": cleanFlags["repository-identity"],
  target: targetFlag({ required: true, multiple: true, multipleNonGreedy: true }),
};

/** Closed native check selector; release-input bytes are admitted during that same parse. */
export const CHECK_MODES = [
  "release",
  "repository-staged",
  "repository-clean",
  "release-input-record",
  "release-input-refresh",
  "current-main-record",
  "current-main-selection",
] as const;
type ModeName = (typeof CHECK_MODES)[number];
type ReleaseRecordInput = Parameters<Client["releases"]["releaseInputRecord"]>[0];
type ParsedMode =
  | { readonly kind: Exclude<ModeName, "release-input-record"> }
  | { readonly kind: "release-input-record"; readonly input: ReleaseRecordInput };

const stagedFields = [
  "content-workspace",
  "repository-identity",
  "content-authority",
  "remote-name",
  "remote-url",
  "ref",
  "release-input",
  "plugin-root",
];
const cleanFields = [...stagedFields, "source-commit", "source-tree"];
const requiredByMode: Record<ModeName, readonly string[]> = {
  release: cleanFields,
  "repository-staged": stagedFields,
  "repository-clean": cleanFields,
  "release-input-record": [],
  "release-input-refresh": [...stagedFields, "member"],
  "current-main-record": [],
  "current-main-selection": ["content-workspace", "repository-identity"],
};
const allowedByMode: Record<ModeName, readonly string[]> = {
  ...requiredByMode,
  release: [...cleanFields, "plugin", "complete-set"],
  "current-main-record": ["current-main-body-json", "current-main-record-json"],
};
const domainFields = [...new Set(Object.values(allowedByMode).flat())];
function modeName(flags: Record<string, unknown>): ModeName {
  // This is called by native relationships only after the mode custom parser succeeds.
  return (flags.mode as ParsedMode).kind;
}

/** Reads raw invocation-local bytes; malformed record contents remain typed service failures. */
export async function readReleaseInput(
  chunks: AsyncIterable<unknown>,
  isTTY: boolean | undefined
): Promise<ReleaseRecordInput> {
  if (isTTY === true) throw new Error("Release-input record requires piped stdin.");
  const parts: Uint8Array[] = [];
  let length = 0;
  for await (const chunk of chunks) {
    if (!(chunk instanceof Uint8Array)) throw new Error("Release-input stdin must contain bytes.");
    if (chunk.byteLength > MAX_RELEASE_INPUT_ENVELOPE_BYTES - length)
      throw new Error("Release-input stdin exceeds the protocol byte limit.");
    parts.push(new Uint8Array(chunk));
    length += chunk.byteLength;
  }
  if (length === 0) throw new Error("Release-input record requires nonempty stdin.");
  const bytes = Buffer.concat(parts, length);
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return { kind: "validate-envelope", bytes };
  }
  return body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    (Object.hasOwn(body, "body") || Object.hasOwn(body, "releaseInputDigest"))
    ? { kind: "validate-envelope", bytes }
    : { kind: "encode-body", body };
}

function recordBytes(value: string): Uint8Array {
  const bytes = new TextEncoder().encode(value);
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_CURRENT_MAIN_RECORD_BYTES)
    throw new Error("Current-main JSON must be nonempty and within the protocol byte limit.");
  return bytes;
}

/** Mode-specific native relationships refuse mixed or incomplete check requests before startup. */
export const checkFlags = {
  json: Flags.boolean(),
  ...workspaceFlags,
  plugin: pluginFlag({ exclusive: ["complete-set"] }),
  "complete-set": Flags.boolean({ exclusive: ["plugin"] }),
  member: pluginFlag({ multiple: true, multipleNonGreedy: true }),
  "current-main-body-json": Flags.custom<Parameters<Client["governance"]["currentMainRecord"]>[0]>({
    allowStdin: false,
    exclusive: ["current-main-record-json"],
    async parse(value) {
      const body: unknown = JSON.parse(new TextDecoder().decode(recordBytes(value)));
      const input = parseCurrentMainRecordInput({ kind: "encode-body", body });
      if (input === undefined) throw new Error("Invalid current-main body.");
      return input;
    },
  })(),
  "current-main-record-json": Flags.custom<
    Parameters<Client["governance"]["currentMainRecord"]>[0]
  >({
    allowStdin: false,
    exclusive: ["current-main-body-json"],
    async parse(value) {
      return { kind: "validate-record", bytes: recordBytes(value) };
    },
  })(),
  mode: Flags.custom<ParsedMode>({
    required: true,
    allowStdin: false,
    options: [...CHECK_MODES],
    async parse(value) {
      const kind = value as ModeName;
      return kind === "release-input-record"
        ? { kind, input: await readReleaseInput(process.stdin, process.stdin.isTTY) }
        : { kind };
    },
    relationships: [
      {
        type: "all",
        flags: domainFields.map((name) => ({
          name,
          when: async (flags) => requiredByMode[modeName(flags)].includes(name),
        })),
      },
      {
        type: "none",
        flags: domainFields.map((name) => ({
          name,
          when: async (flags) => !allowedByMode[modeName(flags)].includes(name),
        })),
      },
      {
        type: "some",
        flags: [
          ...["plugin", "complete-set"].map((name) => ({
            name,
            when: async (flags: Record<string, unknown>) => modeName(flags) === "release",
          })),
          ...["current-main-body-json", "current-main-record-json"].map((name) => ({
            name,
            when: async (flags: Record<string, unknown>) =>
              modeName(flags) === "current-main-record",
          })),
          {
            name: "mode",
            when: async (flags) =>
              modeName(flags) !== "release" && modeName(flags) !== "current-main-record",
          },
        ],
      },
    ],
  })(),
};
