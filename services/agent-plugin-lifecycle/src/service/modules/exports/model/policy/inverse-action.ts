import { isAbsolute, normalize, resolve } from "node:path";

import type { ExportDestinationEntryObservation } from "@rawr/resource-agent-plugin-export-destination";

import {
  compareCanonicalText,
  contentDigest,
  parseContentDigest,
  parsePluginId,
  parseReleaseDigest,
  parseReleaseRelativePath,
  type ContentDigest,
  type PluginId,
  type ReleaseDigest,
  type ReleaseRelativePath,
} from "../../../../shared/release/index";

import type { ExportLayoutV1 } from "../dto/export-lifecycle";
import { bytesEqual, decodeBase64, decodeJson, encodeBase64, jsonLine, sha256, type JsonValue } from "../helpers/canonical";
import {
  visibleDirectoryMode,
  visibleFileMode,
  type CapturedDirectory,
  type CapturedRegularFile,
  type EntryIdentity,
} from "../dto/filesystem";
import type { ExportLedgerDigest } from "./ledger";

export const EXPORT_INVERSE_ACTION_PROTOCOL_VERSION = 1 as const;
export const EXPORT_APPLIED_OBSERVATION_PROTOCOL_VERSION = 1 as const;
export type ExportInverseActionDigest = `eia1_${string}`;
export type ExportAppliedObservationDigest = `eao1_${string}`;

const MAX_INVERSE_ACTION_BYTES = 96 * 1024 * 1024;
const MAX_OBSERVATION_BYTES = 32 * 1024;
const BIGINT_DECIMAL_PATTERN = /^(?:0|[1-9][0-9]{0,39})$/u;

export type ExportFileStateV1 =
  | Readonly<{ kind: "Absent" }>
  | Readonly<{
    kind: "Present";
    mode: number;
    contentDigest: ContentDigest;
    bytesBase64: string;
  }>;

export type ExportDirectoryPriorStateV1 =
  | Readonly<{ kind: "Absent" }>
  | Readonly<{
    kind: "Directory";
    mode: number;
    dev: string;
    ino: string;
    birthtimeNs: string;
  }>;

export type ExportDirectoryExpectedStateV1 =
  | Readonly<{ kind: "Absent" }>
  | Readonly<{ kind: "Directory"; mode: number }>;

export type ExportActionAuthorityV1 =
  | Readonly<{ kind: "plugin-claim"; pluginId: PluginId; releaseDigest: ReleaseDigest }>
  | Readonly<{ kind: "planned-adoption"; pluginId: PluginId; releaseDigest: ReleaseDigest }>
  | Readonly<{ kind: "destination-ledger"; nextGeneration: number }>;

interface ExportInverseActionBaseV1 {
  readonly owner: "agent-plugin-export";
  readonly protocolVersion: typeof EXPORT_INVERSE_ACTION_PROTOCOL_VERSION;
  readonly canonicalDestination: string;
  readonly layout: ExportLayoutV1;
  readonly ledgerGeneration: number;
  readonly ledgerDigest: ExportLedgerDigest;
  readonly authority: ExportActionAuthorityV1;
  readonly relativePath: ReleaseRelativePath;
}

export type ExportInverseActionV1 =
  | (ExportInverseActionBaseV1 & Readonly<{
    mutation: "write-payload" | "retire-payload" | "write-ledger";
    prior: ExportFileStateV1;
    expectedPost: ExportFileStateV1;
  }>)
  | (ExportInverseActionBaseV1 & Readonly<{
    mutation: "create-directory" | "retire-directory";
    prior: ExportDirectoryPriorStateV1;
    expectedPost: ExportDirectoryExpectedStateV1;
  }>);

export type ExportObservedEntryStateV1 =
  | Readonly<{ kind: "Absent" }>
  | Readonly<{
    kind: "File";
    mode: number;
    dev: string;
    ino: string;
    size: string;
    mtimeNs: string;
    ctimeNs: string;
    contentDigest: ContentDigest;
  }>
  | Readonly<{
    kind: "Directory";
    mode: number;
    dev: string;
    ino: string;
    birthtimeNs: string;
  }>;

export interface ExportAppliedObservationV1 {
  readonly owner: "agent-plugin-export";
  readonly protocolVersion: typeof EXPORT_APPLIED_OBSERVATION_PROTOCOL_VERSION;
  readonly actionDigest: ExportInverseActionDigest;
  readonly phase: "forward" | "reverted";
  readonly observedPost: ExportObservedEntryStateV1;
}

export type InverseActionVerification =
  | Readonly<{ ok: true; action: ExportInverseActionV1; actionDigest: ExportInverseActionDigest }>
  | Readonly<{ ok: false; message: string }>;

export type AppliedObservationVerification =
  | Readonly<{ ok: true; observation: ExportAppliedObservationV1; observationDigest: ExportAppliedObservationDigest }>
  | Readonly<{ ok: false; message: string }>;

export function createExportInverseAction(
  input: Omit<ExportInverseActionV1, "owner" | "protocolVersion">,
): ExportInverseActionV1 {
  const parsed = parseAction({
    owner: "agent-plugin-export",
    protocolVersion: EXPORT_INVERSE_ACTION_PROTOCOL_VERSION,
    ...input,
  });
  if (typeof parsed === "string") throw new TypeError(`Cannot create invalid export inverse action: ${parsed}`);
  return parsed;
}

export function canonicalSerializeExportInverseAction(action: ExportInverseActionV1): Uint8Array {
  return canonicalSortedJsonLine(actionValue(action));
}

export function exportInverseActionDigest(action: ExportInverseActionV1): ExportInverseActionDigest {
  return sha256("eia1_", canonicalSerializeExportInverseAction(action)) as ExportInverseActionDigest;
}

export function verifyExportInverseAction(input: unknown): InverseActionVerification {
  const parsed = parseAction(input);
  if (typeof parsed === "string") return { ok: false, message: parsed };
  return { ok: true, action: parsed, actionDigest: exportInverseActionDigest(parsed) };
}

export function decodeExportInverseAction(bytes: unknown): InverseActionVerification {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength > MAX_INVERSE_ACTION_BYTES) {
    return { ok: false, message: "Inverse action bytes are missing or exceed the protocol bound" };
  }
  let input: unknown;
  try {
    input = decodeJson(bytes);
  } catch {
    return { ok: false, message: "Inverse action is not valid UTF-8 JSON" };
  }
  const verified = verifyExportInverseAction(input);
  if (!verified.ok) return verified;
  return bytesEqual(bytes, canonicalSerializeExportInverseAction(verified.action))
    ? verified
    : { ok: false, message: "Inverse action is not canonical" };
}

export function createExportAppliedObservation(
  actionDigest: ExportInverseActionDigest,
  observedPost: ExportObservedEntryStateV1,
  phase: ExportAppliedObservationV1["phase"] = "forward",
): ExportAppliedObservationV1 {
  const parsed = parseObservation({
    owner: "agent-plugin-export",
    protocolVersion: EXPORT_APPLIED_OBSERVATION_PROTOCOL_VERSION,
    actionDigest,
    phase,
    observedPost,
  });
  if (typeof parsed === "string") throw new TypeError(`Cannot create invalid export observation: ${parsed}`);
  return parsed;
}

export function canonicalSerializeExportAppliedObservation(observation: ExportAppliedObservationV1): Uint8Array {
  return canonicalSortedJsonLine(observationValue(observation));
}

export function exportAppliedObservationDigest(observation: ExportAppliedObservationV1): ExportAppliedObservationDigest {
  return sha256("eao1_", canonicalSerializeExportAppliedObservation(observation)) as ExportAppliedObservationDigest;
}

export function verifyExportAppliedObservation(input: unknown): AppliedObservationVerification {
  const parsed = parseObservation(input);
  if (typeof parsed === "string") return { ok: false, message: parsed };
  return { ok: true, observation: parsed, observationDigest: exportAppliedObservationDigest(parsed) };
}

export function decodeExportAppliedObservation(bytes: unknown): AppliedObservationVerification {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength > MAX_OBSERVATION_BYTES) {
    return { ok: false, message: "Applied observation bytes are missing or exceed the protocol bound" };
  }
  let input: unknown;
  try {
    input = decodeJson(bytes);
  } catch {
    return { ok: false, message: "Applied observation is not valid UTF-8 JSON" };
  }
  const verified = verifyExportAppliedObservation(input);
  if (!verified.ok) return verified;
  return bytesEqual(bytes, canonicalSerializeExportAppliedObservation(verified.observation))
    ? verified
    : { ok: false, message: "Applied observation is not canonical" };
}

export function fileStateFromBytes(bytes: Uint8Array, mode: number, digest: ContentDigest): ExportFileStateV1 {
  const state = Object.freeze({ kind: "Present" as const, mode, contentDigest: digest, bytesBase64: encodeBase64(bytes) });
  const parsed = parseFileState(state);
  if (typeof parsed === "string") throw new TypeError(`Cannot create invalid file state: ${parsed}`);
  return parsed;
}

export function fileStateFromCaptured(file: CapturedRegularFile): ExportFileStateV1 {
  return fileStateFromBytes(file.bytes, visibleFileMode(file), file.contentDigest);
}

export function directoryPriorFromCaptured(directory: CapturedDirectory): ExportDirectoryPriorStateV1 {
  return Object.freeze({
    kind: "Directory",
    mode: visibleDirectoryMode(directory),
    ...identityValue(directory),
    birthtimeNs: directory.birthtimeNs.toString(10),
  });
}

export function fileStateFromDestinationObservation(
  file: Extract<ExportDestinationEntryObservation, { kind: "File" }>,
): ExportFileStateV1 {
  return fileStateFromBytes(file.bytes, file.mode, contentDigest(file.bytes));
}

export function directoryPriorFromDestinationObservation(
  directory: Extract<ExportDestinationEntryObservation, { kind: "Directory" }>,
): ExportDirectoryPriorStateV1 {
  return Object.freeze({
    kind: "Directory",
    mode: directory.mode,
    dev: directory.stat.dev,
    ino: directory.stat.ino,
    birthtimeNs: directory.stat.birthtimeNs,
  });
}

export function observedDestinationEntry(
  entry: ExportDestinationEntryObservation,
): ExportObservedEntryStateV1 {
  if (entry.kind === "Absent") return Object.freeze({ kind: "Absent" });
  if (entry.kind === "Directory") return Object.freeze({
    kind: "Directory",
    mode: entry.mode,
    dev: entry.stat.dev,
    ino: entry.stat.ino,
    birthtimeNs: entry.stat.birthtimeNs,
  });
  return Object.freeze({
    kind: "File",
    mode: entry.mode,
    dev: entry.stat.dev,
    ino: entry.stat.ino,
    size: entry.stat.size,
    mtimeNs: entry.stat.mtimeNs,
    ctimeNs: entry.stat.ctimeNs,
    contentDigest: contentDigest(entry.bytes),
  });
}

export function observedFile(file: CapturedRegularFile): ExportObservedEntryStateV1 {
  return Object.freeze({
    kind: "File",
    mode: visibleFileMode(file),
    ...identityValue(file),
    size: file.size.toString(10),
    mtimeNs: file.mtimeNs.toString(10),
    ctimeNs: file.ctimeNs.toString(10),
    contentDigest: file.contentDigest,
  });
}

export function observedDirectory(directory: CapturedDirectory): ExportObservedEntryStateV1 {
  return Object.freeze({
    kind: "Directory",
    mode: visibleDirectoryMode(directory),
    ...identityValue(directory),
    birthtimeNs: directory.birthtimeNs.toString(10),
  });
}

export function fileStateBytes(state: Extract<ExportFileStateV1, { kind: "Present" }>): Uint8Array {
  return decodeBase64(state.bytesBase64);
}

function parseAction(input: unknown): ExportInverseActionV1 | string {
  if (!exactRecord(input, [
    "authority", "canonicalDestination", "expectedPost", "layout", "ledgerDigest",
    "ledgerGeneration", "mutation", "owner", "prior", "protocolVersion", "relativePath",
  ])) return "Inverse action is not a closed object";
  if (input["owner"] !== "agent-plugin-export" || input["protocolVersion"] !== EXPORT_INVERSE_ACTION_PROTOCOL_VERSION) {
    return "Inverse action owner or protocol is unsupported";
  }
  const mutation = input["mutation"];
  if (!isMutation(mutation)) return "Inverse action mutation is unsupported";
  const destination = input["canonicalDestination"];
  if (!isCanonicalAbsolutePath(destination)) return "Inverse destination is not canonical";
  const layout = input["layout"];
  if (layout !== "codex-v1" && layout !== "claude-v1") return "Inverse layout is unsupported";
  const generation = input["ledgerGeneration"];
  if (!Number.isSafeInteger(generation) || (generation as number) < 0) return "Inverse ledger generation is invalid";
  const ledgerDigest = input["ledgerDigest"];
  if (typeof ledgerDigest !== "string" || !/^eld1_[0-9a-f]{64}$/u.test(ledgerDigest)) return "Inverse ledger digest is invalid";
  const authority = parseAuthority(input["authority"]);
  if (typeof authority === "string") return authority;
  const relativePath = valueOf(parseReleaseRelativePath(input["relativePath"]));
  if (relativePath === undefined) return "Inverse relative path is unsafe";
  const common = {
    owner: "agent-plugin-export" as const,
    protocolVersion: EXPORT_INVERSE_ACTION_PROTOCOL_VERSION,
    canonicalDestination: destination,
    layout: layout as ExportLayoutV1,
    ledgerGeneration: generation as number,
    ledgerDigest: ledgerDigest as ExportLedgerDigest,
    authority,
    relativePath,
  };
  if (mutation === "create-directory" || mutation === "retire-directory") {
    const prior = parseDirectoryPrior(input["prior"]);
    const expectedPost = parseDirectoryExpected(input["expectedPost"]);
    if (typeof prior === "string" || typeof expectedPost === "string") return "Inverse directory state is invalid";
    if (mutation === "create-directory" && (prior.kind !== "Absent" || expectedPost.kind !== "Directory")) {
      return "Directory creation must bind absent to directory";
    }
    if (mutation === "retire-directory" && (prior.kind !== "Directory" || expectedPost.kind !== "Absent")) {
      return "Directory retirement must bind directory to absent";
    }
    if (authority.kind === "destination-ledger") return "Directory action cannot use destination-ledger authority";
    return Object.freeze({ ...common, mutation, prior, expectedPost });
  }
  const prior = parseFileState(input["prior"]);
  const expectedPost = parseFileState(input["expectedPost"]);
  if (typeof prior === "string" || typeof expectedPost === "string") return "Inverse file state is invalid";
  if (mutation === "write-payload" && expectedPost.kind !== "Present") return "Payload write must bind a present post-state";
  if (mutation === "retire-payload" && prior.kind !== "Present") return "Payload retirement must bind a present prior state";
  if (mutation === "write-ledger" && authority.kind !== "destination-ledger") return "Ledger write requires ledger authority";
  if (mutation !== "write-ledger" && authority.kind === "destination-ledger") return "Payload action cannot use ledger authority";
  return Object.freeze({ ...common, mutation, prior, expectedPost });
}

function parseObservation(input: unknown): ExportAppliedObservationV1 | string {
  if (!exactRecord(input, ["actionDigest", "observedPost", "owner", "phase", "protocolVersion"])) {
    return "Applied observation is not a closed object";
  }
  if (input["owner"] !== "agent-plugin-export" || input["protocolVersion"] !== EXPORT_APPLIED_OBSERVATION_PROTOCOL_VERSION) {
    return "Applied observation owner or protocol is unsupported";
  }
  const actionDigest = input["actionDigest"];
  if (typeof actionDigest !== "string" || !/^eia1_[0-9a-f]{64}$/u.test(actionDigest)) return "Applied observation action digest is invalid";
  const phase = input["phase"];
  if (phase !== "forward" && phase !== "reverted") return "Applied observation phase is invalid";
  const observedPost = parseObservedEntry(input["observedPost"]);
  if (typeof observedPost === "string") return observedPost;
  return Object.freeze({
    owner: "agent-plugin-export",
    protocolVersion: EXPORT_APPLIED_OBSERVATION_PROTOCOL_VERSION,
    actionDigest: actionDigest as ExportInverseActionDigest,
    phase,
    observedPost,
  });
}

function parseAuthority(input: unknown): ExportActionAuthorityV1 | string {
  if (!exactRecordEither(input, [["kind", "nextGeneration"], ["kind", "pluginId", "releaseDigest"]])) {
    return "Inverse authority is invalid or not closed";
  }
  const kind = input["kind"];
  if (kind === "destination-ledger") {
    const nextGeneration = input["nextGeneration"];
    if (!Number.isSafeInteger(nextGeneration) || (nextGeneration as number) < 1) return "Inverse ledger authority is invalid";
    return Object.freeze({ kind, nextGeneration: nextGeneration as number });
  }
  if (kind !== "plugin-claim" && kind !== "planned-adoption") return "Inverse plugin authority is invalid";
  const pluginId = valueOf(parsePluginId(input["pluginId"]));
  const releaseDigest = valueOf(parseReleaseDigest(input["releaseDigest"]));
  if (pluginId === undefined || releaseDigest === undefined) return "Inverse plugin authority identity is invalid";
  return Object.freeze({ kind, pluginId, releaseDigest });
}

function parseFileState(input: unknown): ExportFileStateV1 | string {
  if (exactRecord(input, ["kind"]) && input["kind"] === "Absent") return Object.freeze({ kind: "Absent" });
  if (!exactRecord(input, ["bytesBase64", "contentDigest", "kind", "mode"]) || input["kind"] !== "Present") return "File state is not closed";
  const mode = parseMode(input["mode"]);
  const parsedDigest = valueOf(parseContentDigest(input["contentDigest"]));
  if (mode === undefined || parsedDigest === undefined || typeof input["bytesBase64"] !== "string") return "Present file state is invalid";
  let bytes: Uint8Array;
  try {
    bytes = decodeBase64(input["bytesBase64"]);
  } catch {
    return "Present file state base64 is invalid";
  }
  if (bytes.byteLength > 64 * 1024 * 1024 || contentDigest(bytes) !== parsedDigest) return "Present file bytes do not match their digest or bound";
  return Object.freeze({ kind: "Present", mode, contentDigest: parsedDigest, bytesBase64: input["bytesBase64"] });
}

function parseDirectoryPrior(input: unknown): ExportDirectoryPriorStateV1 | string {
  if (exactRecord(input, ["kind"]) && input["kind"] === "Absent") return Object.freeze({ kind: "Absent" });
  if (!exactRecord(input, ["birthtimeNs", "dev", "ino", "kind", "mode"]) || input["kind"] !== "Directory") {
    return "Directory prior state is not closed";
  }
  const identity = parseIdentityFields(input);
  const mode = parseMode(input["mode"]);
  const birthtimeNs = parseBigintDecimal(input["birthtimeNs"]);
  if (identity === undefined || mode === undefined || birthtimeNs === undefined) return "Directory prior state is invalid";
  return Object.freeze({ kind: "Directory", mode, ...identity, birthtimeNs });
}

function parseDirectoryExpected(input: unknown): ExportDirectoryExpectedStateV1 | string {
  if (exactRecord(input, ["kind"]) && input["kind"] === "Absent") return Object.freeze({ kind: "Absent" });
  if (!exactRecord(input, ["kind", "mode"]) || input["kind"] !== "Directory") return "Directory expected state is not closed";
  const mode = parseMode(input["mode"]);
  return mode === undefined ? "Directory expected mode is invalid" : Object.freeze({ kind: "Directory", mode });
}

function parseObservedEntry(input: unknown): ExportObservedEntryStateV1 | string {
  if (exactRecord(input, ["kind"]) && input["kind"] === "Absent") return Object.freeze({ kind: "Absent" });
  if (exactRecord(input, ["contentDigest", "ctimeNs", "dev", "ino", "kind", "mode", "mtimeNs", "size"]) && input["kind"] === "File") {
    const identity = parseIdentityFields(input);
    const mode = parseMode(input["mode"]);
    const size = parseBigintDecimal(input["size"]);
    const mtimeNs = parseBigintDecimal(input["mtimeNs"]);
    const ctimeNs = parseBigintDecimal(input["ctimeNs"]);
    const digest = valueOf(parseContentDigest(input["contentDigest"]));
    if (identity === undefined || mode === undefined || size === undefined || mtimeNs === undefined || ctimeNs === undefined || digest === undefined) {
      return "Observed file state is invalid";
    }
    return Object.freeze({ kind: "File", mode, ...identity, size, mtimeNs, ctimeNs, contentDigest: digest });
  }
  if (exactRecord(input, ["birthtimeNs", "dev", "ino", "kind", "mode"]) && input["kind"] === "Directory") {
    const identity = parseIdentityFields(input);
    const mode = parseMode(input["mode"]);
    const birthtimeNs = parseBigintDecimal(input["birthtimeNs"]);
    if (identity === undefined || mode === undefined || birthtimeNs === undefined) return "Observed directory state is invalid";
    return Object.freeze({ kind: "Directory", mode, ...identity, birthtimeNs });
  }
  return "Observed entry state is invalid or not closed";
}

function actionValue(action: ExportInverseActionV1): JsonValue {
  return {
    owner: action.owner,
    protocolVersion: action.protocolVersion,
    mutation: action.mutation,
    canonicalDestination: action.canonicalDestination,
    layout: action.layout,
    ledgerGeneration: action.ledgerGeneration,
    ledgerDigest: action.ledgerDigest,
    authority: action.authority,
    relativePath: action.relativePath,
    prior: action.prior,
    expectedPost: action.expectedPost,
  };
}

function observationValue(observation: ExportAppliedObservationV1): JsonValue {
  return {
    owner: observation.owner,
    protocolVersion: observation.protocolVersion,
    actionDigest: observation.actionDigest,
    phase: observation.phase,
    observedPost: observation.observedPost,
  };
}

function identityValue(identity: EntryIdentity): Readonly<{ dev: string; ino: string }> {
  return Object.freeze({ dev: identity.dev.toString(10), ino: identity.ino.toString(10) });
}

function canonicalSortedJsonLine(value: JsonValue): Uint8Array {
  return jsonLine(sortJsonValue(value));
}

function sortJsonValue(value: JsonValue): JsonValue {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortJsonValue);
  const record = value as { readonly [key: string]: JsonValue };
  const sorted: Record<string, JsonValue> = {};
  for (const key of Object.keys(record).sort(compareCanonicalText)) sorted[key] = sortJsonValue(record[key]!);
  return sorted;
}

function parseIdentityFields(input: Record<string, unknown>): Readonly<{ dev: string; ino: string }> | undefined {
  const dev = parseBigintDecimal(input["dev"]);
  const ino = parseBigintDecimal(input["ino"]);
  return dev === undefined || ino === undefined ? undefined : Object.freeze({ dev, ino });
}

function parseBigintDecimal(input: unknown): string | undefined {
  return typeof input === "string" && BIGINT_DECIMAL_PATTERN.test(input) ? input : undefined;
}

function parseMode(input: unknown): number | undefined {
  return Number.isSafeInteger(input) && (input as number) >= 0 && (input as number) <= 0o777 ? input as number : undefined;
}

function isMutation(input: unknown): input is ExportInverseActionV1["mutation"] {
  return input === "create-directory"
    || input === "retire-directory"
    || input === "write-payload"
    || input === "retire-payload"
    || input === "write-ledger";
}

function exactRecord(input: unknown, keys: readonly string[]): input is Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const actual = Object.keys(input).sort(compareCanonicalText);
  const expected = [...keys].sort(compareCanonicalText);
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function exactRecordEither(input: unknown, variants: readonly (readonly string[])[]): input is Record<string, unknown> {
  return variants.some((keys) => exactRecord(input, keys));
}

function valueOf<T, E>(result: { readonly ok: true; readonly value: T } | { readonly ok: false; readonly issues: readonly E[] }): T | undefined {
  return result.ok ? result.value : undefined;
}

function isCanonicalAbsolutePath(value: unknown): value is string {
  return typeof value === "string" && isAbsolute(value) && value === normalize(value) && value === resolve(value) && value !== "/";
}
