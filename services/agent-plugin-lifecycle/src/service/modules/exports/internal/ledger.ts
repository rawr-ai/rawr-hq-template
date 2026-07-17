import { isAbsolute, normalize, posix, resolve } from "node:path";

import {
  MAX_PAYLOAD_ENTRIES_PER_MEMBER,
  MAX_RELEASE_MEMBERS,
  compareCanonicalText,
  parseContentDigest,
  parsePayloadDigest,
  parsePluginId,
  parseReleaseDigest,
  parseReleaseRelativePath,
  parseReleaseSetDigest,
  type ContentDigest,
  type NormalizedFileMode,
  type PayloadDigest,
  type PluginId,
  type ReleaseDigest,
  type ReleaseRelativePath,
  type ReleaseSetDigest,
} from "../../../shared/release/index";

import type { ExportLayoutV1 } from "./contract";
import { bytesEqual, decodeJson, jsonLine, sha256, type JsonValue } from "./canonical";

export const EXPORT_LEDGER_SCHEMA_VERSION = 1 as const;
export const EXPORT_LEDGER_FILENAME = ".rawr-agent-plugin-export-ledger-v1.json";
export type ExportLedgerDigest = `eld1_${string}`;
const MAX_EXPORT_LEDGER_BYTES = 32 * 1024 * 1024;
const MAX_EXPORT_LEDGER_FILES = 65_536;
const MAX_EXPORT_LEDGER_DIRECTORIES = 131_072;
const MAX_DIRECTORIES_PER_SCOPE = 65_536;

export interface LedgerFileClaimV1 {
  readonly relativePath: ReleaseRelativePath;
  readonly mode: NormalizedFileMode;
  readonly contentDigest: ContentDigest;
}

export interface LedgerPluginScopeV1 {
  readonly pluginId: PluginId;
  readonly releaseDigest: ReleaseDigest;
  readonly payloadDigest: PayloadDigest;
  readonly files: readonly LedgerFileClaimV1[];
  readonly directories: readonly ReleaseRelativePath[];
}

export interface LedgerCompleteSetClaimV1 {
  readonly releaseSetDigest: ReleaseSetDigest;
  readonly members: readonly Readonly<{ pluginId: PluginId; releaseDigest: ReleaseDigest }>[];
}

export interface ExportLedgerBodyV1 {
  readonly schemaVersion: typeof EXPORT_LEDGER_SCHEMA_VERSION;
  readonly canonicalDestination: string;
  readonly layout: ExportLayoutV1;
  readonly generation: number;
  readonly scopes: readonly LedgerPluginScopeV1[];
  readonly completeSet: LedgerCompleteSetClaimV1 | null;
}

export interface ExportLedgerV1 {
  readonly schemaVersion: typeof EXPORT_LEDGER_SCHEMA_VERSION;
  readonly ledgerDigest: ExportLedgerDigest;
  readonly body: ExportLedgerBodyV1;
}

export type LedgerVerification =
  | Readonly<{ ok: true; ledger: ExportLedgerV1; canonicalBytes: Uint8Array }>
  | Readonly<{ ok: false; message: string }>;

export function createExportLedger(
  bodyInput: Omit<ExportLedgerBodyV1, "schemaVersion">,
): ExportLedgerV1 {
  const parsed = parseBody({ schemaVersion: EXPORT_LEDGER_SCHEMA_VERSION, ...bodyInput }, bodyInput.canonicalDestination, true);
  if (typeof parsed === "string") throw new TypeError(`Cannot create invalid export ledger: ${parsed}`);
  const body = parsed;
  const ledgerDigest = digestBody(body);
  const ledger = Object.freeze({ schemaVersion: EXPORT_LEDGER_SCHEMA_VERSION, ledgerDigest, body });
  if (canonicalSerializeExportLedger(ledger).byteLength > MAX_EXPORT_LEDGER_BYTES) {
    throw new TypeError("Cannot create export ledger beyond its canonical byte bound");
  }
  return ledger;
}

export function initialExportLedger(destination: string, layout: ExportLayoutV1): ExportLedgerV1 {
  return createExportLedger({
    canonicalDestination: destination,
    layout,
    generation: 0,
    scopes: Object.freeze([]),
    completeSet: null,
  });
}

export function canonicalSerializeExportLedger(ledger: ExportLedgerV1): Uint8Array {
  return jsonLine(ledgerValue(ledger));
}

export function verifyExportLedgerBytes(
  bytes: Uint8Array,
  expectedDestination: string,
): LedgerVerification {
  if (bytes.byteLength > MAX_EXPORT_LEDGER_BYTES) return { ok: false, message: "Ledger exceeds its protocol bound" };
  let input: unknown;
  try {
    input = decodeJson(bytes);
  } catch {
    return { ok: false, message: "Ledger is not valid UTF-8 JSON" };
  }
  const parsed = parseLedger(input, expectedDestination);
  if (!parsed.ok) return parsed;
  const canonicalBytes = canonicalSerializeExportLedger(parsed.ledger);
  if (!bytesEqual(bytes, canonicalBytes)) return { ok: false, message: "Ledger is not canonical" };
  return { ok: true, ledger: parsed.ledger, canonicalBytes };
}

export function ledgerScope(
  ledger: ExportLedgerV1,
  pluginId: string,
): LedgerPluginScopeV1 | undefined {
  return ledger.body.scopes.find((scope) => scope.pluginId === pluginId);
}

function parseLedger(input: unknown, expectedDestination: string): LedgerVerification {
  if (!exactRecord(input, ["body", "ledgerDigest", "schemaVersion"])) return invalid("Ledger envelope is not closed");
  if (input.schemaVersion !== EXPORT_LEDGER_SCHEMA_VERSION) return invalid("Ledger envelope version is unsupported");
  if (typeof input.ledgerDigest !== "string" || !/^eld1_[0-9a-f]{64}$/u.test(input.ledgerDigest)) {
    return invalid("Ledger digest has the wrong domain");
  }
  const body = parseBody(input.body, expectedDestination);
  if (typeof body === "string") return invalid(body);
  const ledger = Object.freeze({
    schemaVersion: EXPORT_LEDGER_SCHEMA_VERSION,
    ledgerDigest: input.ledgerDigest as ExportLedgerDigest,
    body,
  });
  if (digestBody(body) !== ledger.ledgerDigest) return invalid("Ledger digest does not bind its body");
  return { ok: true, ledger, canonicalBytes: canonicalSerializeExportLedger(ledger) };
}

function parseBody(input: unknown, expectedDestination: string, allowInitial = false): ExportLedgerBodyV1 | string {
  if (!exactRecord(input, ["canonicalDestination", "completeSet", "generation", "layout", "schemaVersion", "scopes"])) {
    return "Ledger body is not closed";
  }
  if (input.schemaVersion !== EXPORT_LEDGER_SCHEMA_VERSION) return "Ledger body version is unsupported";
  if (!isCanonicalAbsolutePath(input.canonicalDestination) || input.canonicalDestination !== expectedDestination) {
    return "Ledger is bound to another canonical destination";
  }
  if (input.layout !== "codex-v1" && input.layout !== "claude-v1") return "Ledger layout is unsupported";
  if (!Number.isSafeInteger(input.generation) || (input.generation as number) < (allowInitial ? 0 : 1)) {
    return allowInitial ? "Ledger generation must be a nonnegative safe integer" : "Persisted ledger generation must be positive";
  }
  if (!Array.isArray(input.scopes) || input.scopes.length > MAX_RELEASE_MEMBERS) return "Ledger scope count exceeds its bound";
  const scopes: LedgerPluginScopeV1[] = [];
  const allPaths = new Set<ReleaseRelativePath>();
  let directoryCount = 0;
  for (const candidate of input.scopes) {
    const scope = parseScope(candidate, input.layout);
    if (typeof scope === "string") return scope;
    if (scope.files.length + allPaths.size > MAX_EXPORT_LEDGER_FILES) return "Ledger file count exceeds its practical bound";
    for (const file of scope.files) {
      if (allPaths.has(file.relativePath)) return "Ledger file ownership is incomplete or ambiguous";
      allPaths.add(file.relativePath);
    }
    directoryCount += scope.directories.length;
    if (directoryCount > MAX_EXPORT_LEDGER_DIRECTORIES) return "Ledger directory count exceeds its practical bound";
    scopes.push(scope);
  }
  scopes.sort((left, right) => compareCanonicalText(left.pluginId, right.pluginId));
  for (let index = 1; index < scopes.length; index += 1) {
    if (scopes[index - 1]!.pluginId === scopes[index]!.pluginId) return "Ledger contains duplicate plugin scopes";
  }
  const completeSet = input.completeSet === null ? null : parseCompleteSet(input.completeSet, scopes);
  if (typeof completeSet === "string") return completeSet;
  if ((input.generation as number) === 0 && (scopes.length !== 0 || completeSet !== null)) {
    return "Initial generation zero cannot contain ownership claims";
  }
  return freezeBody({
    schemaVersion: EXPORT_LEDGER_SCHEMA_VERSION,
    canonicalDestination: input.canonicalDestination,
    layout: input.layout,
    generation: input.generation as number,
    scopes,
    completeSet,
  });
}

function parseScope(input: unknown, layout: ExportLayoutV1): LedgerPluginScopeV1 | string {
  if (!exactRecord(input, ["directories", "files", "payloadDigest", "pluginId", "releaseDigest"])) return "Ledger scope is not closed";
  const pluginId = valueOf(parsePluginId(input.pluginId));
  const releaseDigest = valueOf(parseReleaseDigest(input.releaseDigest));
  const payloadDigest = valueOf(parsePayloadDigest(input.payloadDigest));
  if (pluginId === undefined || releaseDigest === undefined || payloadDigest === undefined) return "Ledger scope identity is invalid";
  if (!Array.isArray(input.files) || input.files.length > MAX_PAYLOAD_ENTRIES_PER_MEMBER) return "Ledger scope file count exceeds its bound";
  const files: LedgerFileClaimV1[] = [];
  for (const candidate of input.files) {
    if (!exactRecord(candidate, ["contentDigest", "mode", "relativePath"])) return "Ledger file claim is not closed";
    const relativePath = valueOf(parseReleaseRelativePath(candidate.relativePath));
    const mode = candidate.mode === 0o644 || candidate.mode === 0o755 ? candidate.mode : undefined;
    const contentDigest = valueOf(parseContentDigest(candidate.contentDigest));
    if (relativePath === undefined || mode === undefined || contentDigest === undefined) return "Ledger file claim is invalid";
    files.push(Object.freeze({ relativePath, mode, contentDigest }));
  }
  files.sort((left, right) => compareCanonicalText(left.relativePath, right.relativePath));
  if (new Set(files.map((file) => file.relativePath)).size !== files.length) return "Ledger scope contains duplicate file claims";
  const prefix = `${layout === "codex-v1" ? "codex" : "claude"}/plugins/${pluginId}/`;
  if (files.some((file) => !file.relativePath.startsWith(prefix))) return "Ledger scope claims a file outside its exact layout/plugin prefix";
  if (!Array.isArray(input.directories) || input.directories.length > MAX_DIRECTORIES_PER_SCOPE) return "Ledger directory count exceeds its bound";
  const directories: ReleaseRelativePath[] = [];
  for (const candidate of input.directories) {
    const directory = valueOf(parseReleaseRelativePath(candidate));
    if (directory === undefined) return "Ledger directory claim is invalid";
    directories.push(directory);
  }
  directories.sort(compareCanonicalText);
  if (new Set(directories).size !== directories.length) return "Ledger scope contains duplicate directory claims";
  const expectedDirectories = ancestorClosure(files.map((file) => file.relativePath));
  if (typeof expectedDirectories === "string") return expectedDirectories;
  if (
    directories.length !== expectedDirectories.length
    || directories.some((directory, index) => directory !== expectedDirectories[index])
  ) return "Ledger directory claims do not equal the exact ancestor closure of owned files";
  return Object.freeze({
    pluginId,
    releaseDigest,
    payloadDigest,
    files: Object.freeze(files),
    directories: Object.freeze(directories),
  });
}

function parseCompleteSet(
  input: unknown,
  scopes: readonly LedgerPluginScopeV1[],
): LedgerCompleteSetClaimV1 | string {
  if (!exactRecord(input, ["members", "releaseSetDigest"])) return "Complete-set claim is not closed";
  const digest = valueOf(parseReleaseSetDigest(input.releaseSetDigest));
  if (digest === undefined || !Array.isArray(input.members) || input.members.length > MAX_RELEASE_MEMBERS) {
    return "Complete-set claim is invalid";
  }
  const members: Array<{ pluginId: PluginId; releaseDigest: ReleaseDigest }> = [];
  for (const candidate of input.members) {
    if (!exactRecord(candidate, ["pluginId", "releaseDigest"])) return "Complete-set member is not closed";
    const pluginId = valueOf(parsePluginId(candidate.pluginId));
    const releaseDigest = valueOf(parseReleaseDigest(candidate.releaseDigest));
    if (pluginId === undefined || releaseDigest === undefined) return "Complete-set member is invalid";
    members.push(Object.freeze({ pluginId, releaseDigest }));
  }
  members.sort((left, right) => compareCanonicalText(left.pluginId, right.pluginId));
  if (
    members.length !== scopes.length
    || members.some((member, index) => member.pluginId !== scopes[index]?.pluginId || member.releaseDigest !== scopes[index]?.releaseDigest)
  ) return "Complete-set claim does not equal the ledger scopes";
  return Object.freeze({ releaseSetDigest: digest, members: Object.freeze(members) });
}

function freezeBody(body: ExportLedgerBodyV1): ExportLedgerBodyV1 {
  const scopes = Object.freeze([...body.scopes]
    .map((scope) => Object.freeze({
      ...scope,
      files: Object.freeze([...scope.files].sort((left, right) => compareCanonicalText(left.relativePath, right.relativePath))),
      directories: Object.freeze([...scope.directories].sort(compareCanonicalText)),
    }))
    .sort((left, right) => compareCanonicalText(left.pluginId, right.pluginId)));
  return Object.freeze({ ...body, scopes });
}

function digestBody(body: ExportLedgerBodyV1): ExportLedgerDigest {
  return sha256("eld1_", jsonLine(bodyValue(body))) as ExportLedgerDigest;
}

function ledgerValue(ledger: ExportLedgerV1): JsonValue {
  return {
    schemaVersion: ledger.schemaVersion,
    ledgerDigest: ledger.ledgerDigest,
    body: bodyValue(ledger.body),
  };
}

function bodyValue(body: ExportLedgerBodyV1): JsonValue {
  return {
    schemaVersion: body.schemaVersion,
    canonicalDestination: body.canonicalDestination,
    layout: body.layout,
    generation: body.generation,
    scopes: body.scopes.map((scope) => ({
      pluginId: scope.pluginId,
      releaseDigest: scope.releaseDigest,
      payloadDigest: scope.payloadDigest,
      files: scope.files.map((file) => ({
        relativePath: file.relativePath,
        mode: file.mode,
        contentDigest: file.contentDigest,
      })),
      directories: scope.directories,
    })),
    completeSet: body.completeSet === null ? null : {
      releaseSetDigest: body.completeSet.releaseSetDigest,
      members: body.completeSet.members.map((member) => ({
        pluginId: member.pluginId,
        releaseDigest: member.releaseDigest,
      })),
    },
  };
}

function exactRecord(input: unknown, keys: readonly string[]): input is Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const actual = Object.keys(input).sort(compareCanonicalText);
  const expected = [...keys].sort(compareCanonicalText);
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function valueOf<T, E>(result: { readonly ok: true; readonly value: T } | { readonly ok: false; readonly issues: readonly E[] }): T | undefined {
  return result.ok ? result.value : undefined;
}

function isCanonicalAbsolutePath(value: unknown): value is string {
  return typeof value === "string" && isAbsolute(value) && value === normalize(value) && value === resolve(value) && value !== "/";
}

function invalid(message: string): LedgerVerification {
  return { ok: false, message };
}

function ancestorClosure(paths: readonly ReleaseRelativePath[]): readonly ReleaseRelativePath[] | string {
  const directories = new Set<ReleaseRelativePath>();
  for (const path of paths) {
    let current = posix.dirname(path);
    while (current !== ".") {
      const parsed = valueOf(parseReleaseRelativePath(current));
      if (parsed === undefined) throw new Error("Derived ledger directory is unsafe");
      directories.add(parsed);
      if (directories.size > MAX_DIRECTORIES_PER_SCOPE) return "Ledger derived directory count exceeds its practical bound";
      current = posix.dirname(current);
    }
  }
  return Object.freeze([...directories].sort(compareCanonicalText));
}
