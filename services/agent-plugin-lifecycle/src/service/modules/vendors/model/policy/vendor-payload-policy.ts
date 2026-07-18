import { createHash } from "node:crypto";

import type {
  ContentTreeEntry,
  GitObjectFormat,
  MaterializedContentTreeEntry,
} from "@rawr/resource-content-workspace";

import {
  GIT_OBJECT_ID_PATTERN,
  NORMALIZED_RELATIVE_PATH_PATTERN,
} from "../dto/vendor-records";

const gitObjectId = new RegExp(GIT_OBJECT_ID_PATTERN, "u");
const normalizedRelativePath = new RegExp(NORMALIZED_RELATIVE_PATH_PATTERN, "u");
const encoder = new TextEncoder();

export function vendorPayloadLayoutIssue(
  entries: readonly ContentTreeEntry[],
  objectFormat: GitObjectFormat,
): string | undefined {
  if (entries.length === 0) return "The vendor payload is empty.";
  const paths = new Set<string>();
  let previous = "";
  let hasSkill = false;
  for (const entry of entries) {
    if (
      !normalizedRelativePath.test(entry.path)
      || !gitObjectId.test(entry.blob)
      || entry.blob.length !== objectIdLength(objectFormat)
      || paths.has(entry.path)
      || (previous !== "" && compareText(previous, entry.path) >= 0)
    ) {
      return "The vendor payload contains an invalid, duplicate, or non-canonical entry.";
    }
    if (entry.path === "SKILL.md") hasSkill = true;
    paths.add(entry.path);
    previous = entry.path;
  }
  return hasSkill ? undefined : "The vendor payload does not contain a regular SKILL.md.";
}

export function materializedPayloadIssue(
  expected: readonly ContentTreeEntry[],
  actual: readonly MaterializedContentTreeEntry[],
  objectFormat: GitObjectFormat,
): string | undefined {
  if (expected.length !== actual.length) return "Materialized payload entry count changed after observation.";
  for (let index = 0; index < expected.length; index += 1) {
    const observed = expected[index];
    const materialized = actual[index];
    if (
      observed === undefined
      || materialized === undefined
      || observed.path !== materialized.path
      || observed.mode !== materialized.mode
      || observed.blob !== materialized.blob
      || !(materialized.bytes instanceof Uint8Array)
      || gitBlobId(materialized.bytes, objectFormat) !== materialized.blob
    ) {
      return "Materialized payload bytes do not match the observed Git tree.";
    }
  }
  return undefined;
}

export function sameTreeEntries(
  left: readonly ContentTreeEntry[],
  right: readonly ContentTreeEntry[],
): boolean {
  return left.length === right.length && left.every((entry, index) => {
    const candidate = right[index];
    return candidate !== undefined
      && entry.path === candidate.path
      && entry.mode === candidate.mode
      && entry.blob === candidate.blob;
  });
}

export function cloneMaterializedEntries(
  entries: readonly MaterializedContentTreeEntry[],
): readonly MaterializedContentTreeEntry[] {
  return Object.freeze(entries.map((entry) => Object.freeze({
    path: entry.path,
    mode: entry.mode,
    blob: entry.blob,
    bytes: new Uint8Array(entry.bytes),
  })));
}

export function validGitObjectForFormat(value: string, objectFormat: GitObjectFormat): boolean {
  return gitObjectId.test(value) && value.length === objectIdLength(objectFormat);
}

function gitBlobId(bytes: Uint8Array, objectFormat: GitObjectFormat): string {
  const hash = createHash(objectFormat);
  hash.update(encoder.encode(`blob ${bytes.byteLength}\0`));
  hash.update(bytes);
  return hash.digest("hex");
}

function objectIdLength(objectFormat: GitObjectFormat): number {
  return objectFormat === "sha1" ? 40 : 64;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
