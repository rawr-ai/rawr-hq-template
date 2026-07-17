import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import {
  chmod,
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
  rename,
  rmdir,
  unlink,
} from "node:fs/promises";
import path from "node:path";

import {
  canonicalSerializeAgentPluginReleaseInput,
  createAgentPluginReleaseInput,
  decodeAgentPluginReleaseInput,
  type AgentPluginReleaseInput,
} from "@rawr/agent-plugin-lifecycle/release";
import {
  VENDOR_LOCK_PROTOCOL,
  VENDOR_PROVENANCE_PROTOCOL,
  VENDOR_SOURCE_PROTOCOL,
  type VendorAuthoringPlan,
  type VendorContentWorkspaceRef,
  type VendorDeclaredSourceObservation,
  type VendorLifecycleRuntime,
  type VendorLockRecord,
  type VendorProvenanceRecord,
  type VendorRecordBinding,
  type VendorRepositoryAuthor,
  type VendorRepositoryObserver,
  type VendorSourceDeclaration,
  type VendorSourceIdentity,
  type VendorUpdateIssue,
  type VendorWorkspaceObservation,
} from "@rawr/agent-plugin-lifecycle/ports/vendors";

import { createGitCommandRunner, type GitCommandRunner } from "../releases/git/process";
import {
  canonicalJsonBytes,
  equalBytes,
  gitBlobId,
  sha256ContentDigest,
  vendorPayloadDigest,
} from "./canonical";
import { createGitVendorUpstreamObserver } from "./upstream";

const decoder = new TextDecoder("utf-8", { fatal: true });
const MAX_RECORD_BYTES = 1024 * 1024;
const PATH_PATTERN = /^(?!\/)(?!-)(?!\.?\.?$)(?!.*\/\.\.?(?:\/|$))(?!.*\/\/)(?!.*\\)[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/u;
const SOURCE_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,126}[a-z0-9])?$/u;
const REPOSITORY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/+\-]{0,511}$/u;
const REF_PATTERN = /^refs\/heads\/(?![./])(?!.*(?:\.\.|@\{|\/\/|[~^:?*\[\]\\]))(?!.*[./]$)[A-Za-z0-9._/-]+$/u;
const OBJECT_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const DIGEST_PATTERN = /^sha256_[0-9a-f]{64}$/u;
const UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

type PreimageEntry = Readonly<{
  path: string;
  kind: "directory" | "file";
  mode: number;
  bytes?: Uint8Array;
}>;

type Preimage = Readonly<{
  planIdentity: string;
  paths: ReadonlyMap<string, readonly PreimageEntry[] | null>;
}>;

export async function createNodeVendorLifecycleRuntime(options: Readonly<{
  gitExecutable: string;
  now?: () => Date;
}>): Promise<VendorLifecycleRuntime> {
  const git = await createGitCommandRunner({ gitExecutable: options.gitExecutable });
  const repository = createNodeVendorRepositoryObserver(git);
  return Object.freeze({
    repository,
    upstream: await createGitVendorUpstreamObserver(options),
    authoring: createNodeVendorRepositoryAuthor(repository),
  });
}

function createNodeVendorRepositoryObserver(git: GitCommandRunner): VendorRepositoryObserver {
  return Object.freeze({
    async observe(contentWorkspace: VendorContentWorkspaceRef) {
      try {
        const root = await requireWorkspaceRoot(git, contentWorkspace.locator);
        const metadata = await observeGitWorkspace(git, root, contentWorkspace.repositoryIdentity);
        const releaseInputPath = resolveContained(root, contentWorkspace.releaseInputPath);
        const releaseInputBytes = await readBoundedRegularFile(releaseInputPath, MAX_RECORD_BYTES * 96);
        const decoded = decodeAgentPluginReleaseInput(releaseInputBytes);
        if (!decoded.ok) return invalid("PayloadMismatch", "Canonical release input is invalid");
        const releaseInput = decoded.value;
        if (releaseInput.body.contentAuthority !== contentWorkspace.contentAuthority) {
          return invalid("WrongRepository", "Release input declares a different content authority");
        }
        const sources: VendorDeclaredSourceObservation[] = [];
        for (const member of releaseInput.body.members) {
          for (const binding of member.vendor.filter((candidate) => candidate.protocol === VENDOR_SOURCE_PROTOCOL)) {
            sources.push(await observeDeclaredSource(root, releaseInput, member.pluginId, binding));
          }
        }
        sources.sort((left, right) => compareText(left.declaration.sourceId, right.declaration.sourceId));
        const observation: VendorWorkspaceObservation = Object.freeze({
          contentWorkspace: Object.freeze({
            repositoryIdentity: contentWorkspace.repositoryIdentity,
            contentAuthority: contentWorkspace.contentAuthority,
            refName: metadata.refName,
            sourceCommit: metadata.commit,
            sourceTree: metadata.tree,
            releaseInputPath: contentWorkspace.releaseInputPath,
          }),
          snapshotDigest: sha256ContentDigest(canonicalJsonBytes({
            releaseInput: sha256ContentDigest(releaseInputBytes),
            sources: sources.map(sourceSnapshotValue),
          })),
          sources: Object.freeze(sources),
        });
        return Object.freeze({ kind: "Observed", observation });
      } catch (error) {
        return Object.freeze({ kind: "Unavailable", detail: errorMessage(error) });
      }
    },
  });
}

async function observeDeclaredSource(
  root: string,
  releaseInput: AgentPluginReleaseInput,
  memberPluginId: string,
  sourceBindingInput: AgentPluginReleaseInput["body"]["members"][number]["vendor"][number],
): Promise<VendorDeclaredSourceObservation> {
  const declarationBinding = binding(sourceBindingInput, VENDOR_SOURCE_PROTOCOL);
  const declarationRead = await readRecord(
    resolveContained(root, declarationBinding.id),
    parseDeclaration,
    encodeDeclaration,
  );
  const declaration = declarationRead.value;
  const member = releaseInput.body.members.find((candidate) => candidate.pluginId === memberPluginId)!;
  const provenanceInput = member.vendor.find((candidate) =>
    candidate.protocol === VENDOR_PROVENANCE_PROTOCOL && candidate.id === declaration.provenancePath);
  const lockInput = releaseInput.body.locks.find((candidate) =>
    candidate.protocol === VENDOR_LOCK_PROTOCOL && candidate.id === declaration.lockPath);
  const provenanceBinding = provenanceInput === undefined ? null : binding(provenanceInput, VENDOR_PROVENANCE_PROTOCOL);
  const lockBinding = lockInput === undefined ? null : binding(lockInput, VENDOR_LOCK_PROTOCOL);
  const provenanceRead = provenanceBinding === null
    ? null
    : await readRecord(resolveContained(root, provenanceBinding.id), parseProvenance, encodeProvenance);
  const lockRead = lockBinding === null
    ? null
    : await readRecord(resolveContained(root, lockBinding.id), parseLock, encodeLock);
  const destination = lockRead === null
    ? Object.freeze({ kind: "Invalid" as const, detail: "Vendor lock binding is missing" })
    : await observeDestination(root, declaration.destinationPath, lockRead.value.admitted.sourceTree.length);
  return Object.freeze({
    memberPluginId,
    declarationBinding,
    declarationContentDigest: declarationRead.digest,
    declaration,
    provenanceBinding,
    provenanceContentDigest: provenanceRead?.digest ?? null,
    provenance: provenanceRead?.value ?? null,
    lockBinding,
    lockContentDigest: lockRead?.digest ?? null,
    lock: lockRead?.value ?? null,
    destination,
  });
}

function createNodeVendorRepositoryAuthor(repository: VendorRepositoryObserver): VendorRepositoryAuthor {
  const preimages = new Map<string, Preimage>();
  return Object.freeze({
    async capture(plan: VendorAuthoringPlan) {
      try {
        const current = await repository.observe(plan.contentWorkspace);
        if (current.kind !== "Observed") {
          return Object.freeze({ kind: "Failed", detail: current.kind === "Invalid"
            ? current.issues.map((issue) => issue.detail).join("; ")
            : current.detail });
        }
        if (current.observation.snapshotDigest !== plan.expectedSnapshotDigest) {
          return Object.freeze({ kind: "Stale", detail: "Vendor repository changed before preimage capture" });
        }
        const paths = new Map<string, readonly PreimageEntry[] | null>();
        for (const relative of plan.changedPaths) {
          paths.set(relative, await capturePath(plan.contentWorkspace.locator, relative));
        }
        const handle = `vendor-preimage:${randomUUID()}`;
        preimages.set(handle, Object.freeze({ planIdentity: planIdentity(plan), paths }));
        return Object.freeze({ kind: "Captured", preimageHandle: handle });
      } catch (error) {
        return Object.freeze({ kind: "Failed", detail: errorMessage(error) });
      }
    },
    async apply(plan: VendorAuthoringPlan, preimageHandle: string) {
      const preimage = preimages.get(preimageHandle);
      if (preimage === undefined || preimage.planIdentity !== planIdentity(plan)) {
        return Object.freeze({ kind: "FailedBeforeMutation", detail: "Vendor preimage handle does not bind the authoring plan" });
      }
      const mutated: string[] = [];
      try {
        const intended = await buildAuthoringBytes(plan);
        if (await authoringAlreadyApplied(plan, intended)) return Object.freeze({ kind: "Converged" });
        for (const relative of plan.changedPaths) {
          const current = await capturePath(plan.contentWorkspace.locator, relative);
          const captured = preimage.paths.get(relative) ?? null;
          if (!samePreimage(current, captured)) {
            throw new Error(`Vendor authoring path changed after preimage capture: ${relative}`);
          }
        }
        for (const change of plan.sourceChanges) {
          await synchronizePayload(plan.contentWorkspace.locator, change.destinationPath, change.payload.entries);
          mutated.push(change.destinationPath);
          await writeAtomic(resolveContained(plan.contentWorkspace.locator, change.declarationPath), intended.records.get(change.declarationPath)!);
          mutated.push(change.declarationPath);
          await writeAtomic(resolveContained(plan.contentWorkspace.locator, change.provenancePath), intended.records.get(change.provenancePath)!);
          mutated.push(change.provenancePath);
          await writeAtomic(resolveContained(plan.contentWorkspace.locator, change.lockPath), intended.records.get(change.lockPath)!);
          mutated.push(change.lockPath);
        }
        await writeAtomic(resolveContained(plan.contentWorkspace.locator, plan.releaseInputPath), intended.releaseInput);
        mutated.push(plan.releaseInputPath);
        return Object.freeze({ kind: "Applied", changedPaths: plan.changedPaths });
      } catch (error) {
        return mutated.length === 0
          ? Object.freeze({ kind: "FailedBeforeMutation", detail: errorMessage(error) })
          : Object.freeze({
              kind: "FailedAfterMutation",
              mutatedPaths: Object.freeze([...new Set(mutated)].sort()),
              detail: errorMessage(error),
            });
      }
    },
    async restore(plan: VendorAuthoringPlan, preimageHandle: string) {
      const preimage = preimages.get(preimageHandle);
      if (preimage === undefined || preimage.planIdentity !== planIdentity(plan)) {
        return Object.freeze({ kind: "Failed", unsettledPaths: plan.changedPaths, detail: "Vendor preimage is unavailable" });
      }
      const unsettled: string[] = [];
      try {
        for (const relative of [...plan.changedPaths].sort().reverse()) {
          try {
            await restorePath(plan.contentWorkspace.locator, relative, preimage.paths.get(relative) ?? null);
          } catch {
            unsettled.push(relative);
          }
        }
      } finally {
        preimages.delete(preimageHandle);
      }
      return unsettled.length === 0
        ? Object.freeze({ kind: "Restored", restoredPaths: plan.changedPaths })
        : Object.freeze({ kind: "Failed", unsettledPaths: Object.freeze(unsettled.sort()), detail: "One or more vendor paths could not be restored" });
    },
  });
}

async function buildAuthoringBytes(plan: VendorAuthoringPlan): Promise<Readonly<{
  records: ReadonlyMap<string, Uint8Array>;
  releaseInput: Uint8Array;
}>> {
  const releaseBytes = await readBoundedRegularFile(
    resolveContained(plan.contentWorkspace.locator, plan.releaseInputPath),
    MAX_RECORD_BYTES * 96,
  );
  const decoded = decodeAgentPluginReleaseInput(releaseBytes);
  if (!decoded.ok) throw new Error("Release input became invalid before vendor authoring");
  const records = new Map<string, Uint8Array>();
  const digestByBinding = new Map<string, string>();
  for (const change of plan.sourceChanges) {
    const declarationBytes = encodeDeclaration(change.nextRecords.declaration);
    const provenanceBytes = encodeProvenance(change.nextRecords.provenance);
    const lockBytes = encodeLock(change.nextRecords.lock);
    records.set(change.declarationPath, declarationBytes);
    records.set(change.provenancePath, provenanceBytes);
    records.set(change.lockPath, lockBytes);
    digestByBinding.set(bindingKey(change.memberPluginId, change.declarationBinding), sha256ContentDigest(declarationBytes));
    digestByBinding.set(bindingKey(change.memberPluginId, change.provenanceBinding), sha256ContentDigest(provenanceBytes));
    digestByBinding.set(bindingKey("@locks", change.lockBinding), sha256ContentDigest(lockBytes));
  }
  const body = decoded.value.body;
  const created = createAgentPluginReleaseInput({
    ...body,
    members: body.members.map((member) => ({
      ...member,
      vendor: member.vendor.map((candidate) => ({
        ...candidate,
        contentDigest: digestByBinding.get(bindingKey(member.pluginId, candidate)) ?? candidate.contentDigest,
      })),
    })),
    locks: body.locks.map((candidate) => ({
      ...candidate,
      contentDigest: digestByBinding.get(bindingKey("@locks", candidate)) ?? candidate.contentDigest,
    })),
  });
  if (!created.ok) throw new Error(created.issues.map((issue) => issue.message).join("; "));
  return Object.freeze({ records, releaseInput: canonicalSerializeAgentPluginReleaseInput(created.value) });
}

async function authoringAlreadyApplied(
  plan: VendorAuthoringPlan,
  intended: Readonly<{ records: ReadonlyMap<string, Uint8Array>; releaseInput: Uint8Array }>,
): Promise<boolean> {
  for (const [relative, bytes] of intended.records) {
    if (!equalBytes(await readBoundedRegularFile(resolveContained(plan.contentWorkspace.locator, relative), MAX_RECORD_BYTES), bytes)) return false;
  }
  return equalBytes(
    await readBoundedRegularFile(resolveContained(plan.contentWorkspace.locator, plan.releaseInputPath), MAX_RECORD_BYTES * 96),
    intended.releaseInput,
  );
}

async function observeGitWorkspace(
  git: GitCommandRunner,
  root: string,
  repositoryIdentity: string,
): Promise<Readonly<{ refName: string; commit: string; tree: string }>> {
  const refName = await gitText(git, root, ["symbolic-ref", "--quiet", "HEAD"]);
  const commit = await gitText(git, root, ["rev-parse", "--verify", "HEAD^{commit}"]);
  const tree = await gitText(git, root, ["rev-parse", "--verify", "HEAD^{tree}"]);
  const remotes = (await gitText(git, root, ["remote"])).split("\n").filter(Boolean);
  const urls: string[] = [];
  for (const remote of remotes) {
    urls.push(...(await gitText(git, root, ["remote", "get-url", "--all", remote])).split("\n").filter(Boolean));
  }
  if (!urls.includes(repositoryIdentity)) throw new Error("Content repository identity is not configured by any exact remote URL");
  return Object.freeze({ refName, commit, tree });
}

async function requireWorkspaceRoot(git: GitCommandRunner, candidate: string): Promise<string> {
  const status = await lstat(candidate, { bigint: true });
  const canonical = await realpath(candidate);
  if (!status.isDirectory() || status.isSymbolicLink() || canonical !== candidate) {
    throw new Error("Content workspace must be a canonical non-symlink directory");
  }
  const observed = await gitText(git, candidate, ["rev-parse", "--show-toplevel"]);
  if (observed !== candidate) throw new Error("Content workspace locator aliases another Git root");
  return candidate;
}

async function observeDestination(root: string, relative: string, objectIdLength: number) {
  try {
    const entries = await readPayloadEntries(resolveContained(root, relative), objectIdLength);
    return Object.freeze({ kind: "Present" as const, payloadDigest: vendorPayloadDigest(entries) });
  } catch (error) {
    return hasCode(error, "ENOENT")
      ? Object.freeze({ kind: "Missing" as const })
      : Object.freeze({ kind: "Invalid" as const, detail: errorMessage(error) });
  }
}

async function readPayloadEntries(root: string, objectIdLength: number) {
  const entries: Array<Readonly<{ path: string; mode: "100644" | "100755"; blob: string }>> = [];
  await walkPayload(root, "", objectIdLength, entries);
  entries.sort((left, right) => compareText(left.path, right.path));
  return Object.freeze(entries);
}

async function walkPayload(
  root: string,
  relative: string,
  objectIdLength: number,
  entries: Array<Readonly<{ path: string; mode: "100644" | "100755"; blob: string }>>,
): Promise<void> {
  const directory = relative === "" ? root : path.join(root, ...relative.split("/"));
  const status = await lstat(directory, { bigint: true });
  if (!status.isDirectory() || status.isSymbolicLink()) throw new Error("Vendor payload contains a non-directory root");
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => compareText(a.name, b.name))) {
    const childRelative = relative === "" ? entry.name : `${relative}/${entry.name}`;
    if (!PATH_PATTERN.test(childRelative)) throw new Error("Vendor payload path is not canonical");
    const child = path.join(directory, entry.name);
    const childStatus = await lstat(child, { bigint: true });
    if (childStatus.isSymbolicLink()) throw new Error("Vendor payload may not contain symbolic links");
    if (childStatus.isDirectory()) {
      await walkPayload(root, childRelative, objectIdLength, entries);
    } else if (childStatus.isFile()) {
      const bytes = await readBoundedRegularFile(child, 64 * 1024 * 1024);
      entries.push(Object.freeze({
        path: childRelative,
        mode: (Number(childStatus.mode) & 0o111) === 0 ? "100644" : "100755",
        blob: gitBlobId(bytes, objectIdLength),
      }));
    } else {
      throw new Error("Vendor payload contains an unsupported entry type");
    }
  }
}

async function synchronizePayload(
  workspaceRoot: string,
  relativeRoot: string,
  desired: readonly Readonly<{ path: string; mode: "100644" | "100755"; bytes: Uint8Array }>[],
): Promise<void> {
  const root = resolveContained(workspaceRoot, relativeRoot);
  await mkdir(root, { recursive: true, mode: 0o700 });
  const wanted = new Set(desired.map((entry) => entry.path));
  const current = await captureTree(root);
  for (const entry of [...current].reverse()) {
    if (entry.path === "") continue;
    const keep = entry.kind === "file"
      ? wanted.has(entry.path)
      : desired.some((candidate) => candidate.path.startsWith(`${entry.path}/`));
    if (keep) continue;
    const candidate = entry.path === "" ? root : path.join(root, ...entry.path.split("/"));
    if (entry.kind === "file") await unlink(candidate);
    else await rmdir(candidate);
  }
  for (const entry of desired) {
    const destination = resolveContained(root, entry.path);
    await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
    await writeAtomic(destination, entry.bytes);
    await chmod(destination, entry.mode === "100755" ? 0o755 : 0o644);
  }
}

async function capturePath(root: string, relative: string): Promise<readonly PreimageEntry[] | null> {
  const candidate = resolveContained(root, relative);
  try {
    return await captureTree(candidate);
  } catch (error) {
    if (hasCode(error, "ENOENT")) return null;
    throw error;
  }
}

function samePreimage(
  left: readonly PreimageEntry[] | null,
  right: readonly PreimageEntry[] | null,
): boolean {
  if (left === null || right === null) return left === right;
  if (left.length !== right.length) return false;
  return left.every((entry, index) => {
    const expected = right[index];
    return expected !== undefined
      && entry.path === expected.path
      && entry.kind === expected.kind
      && entry.mode === expected.mode
      && (entry.kind === "directory"
        || (expected.kind === "file" && equalBytes(entry.bytes!, expected.bytes!)));
  });
}

async function captureTree(root: string): Promise<readonly PreimageEntry[]> {
  const entries: PreimageEntry[] = [];
  await captureEntry(root, "", entries);
  return Object.freeze(entries);
}

async function captureEntry(root: string, relative: string, entries: PreimageEntry[]): Promise<void> {
  const candidate = relative === "" ? root : path.join(root, ...relative.split("/"));
  const status = await lstat(candidate, { bigint: true });
  if (status.isSymbolicLink()) throw new Error("Vendor authoring path contains a symbolic link");
  if (status.isFile()) {
    entries.push(Object.freeze({ path: relative, kind: "file", mode: Number(status.mode) & 0o777, bytes: await readBoundedRegularFile(candidate, 64 * 1024 * 1024) }));
    return;
  }
  if (!status.isDirectory()) throw new Error("Vendor authoring path contains an unsupported entry");
  entries.push(Object.freeze({ path: relative, kind: "directory", mode: Number(status.mode) & 0o777 }));
  for (const entry of (await readdir(candidate)).sort()) {
    await captureEntry(root, relative === "" ? entry : `${relative}/${entry}`, entries);
  }
}

async function restorePath(root: string, relative: string, preimage: readonly PreimageEntry[] | null): Promise<void> {
  const candidate = resolveContained(root, relative);
  await removeIfPresent(candidate);
  if (preimage === null) return;
  for (const entry of preimage.filter((item) => item.kind === "directory").sort((a, b) => a.path.length - b.path.length)) {
    const destination = entry.path === "" ? candidate : path.join(candidate, ...entry.path.split("/"));
    await mkdir(destination, { recursive: true, mode: entry.mode });
    await chmod(destination, entry.mode);
  }
  for (const entry of preimage.filter((item) => item.kind === "file")) {
    const destination = entry.path === "" ? candidate : path.join(candidate, ...entry.path.split("/"));
    await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
    await writeAtomic(destination, entry.bytes!);
    await chmod(destination, entry.mode);
  }
}

async function removeIfPresent(candidate: string): Promise<void> {
  let entries;
  try {
    entries = await captureTree(candidate);
  } catch (error) {
    if (hasCode(error, "ENOENT")) return;
    throw error;
  }
  for (const entry of [...entries].reverse()) {
    const target = entry.path === "" ? candidate : path.join(candidate, ...entry.path.split("/"));
    if (entry.kind === "file") await unlink(target);
    else await rmdir(target);
  }
}

async function writeAtomic(destination: string, bytes: Uint8Array): Promise<void> {
  await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
  const temporary = path.join(path.dirname(destination), `.rawr-vendor-${randomUUID()}.tmp`);
  const handle = await open(temporary, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await rename(temporary, destination);
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
}

async function readRecord<T>(
  candidate: string,
  parse: (input: unknown) => T,
  encode: (value: T) => Uint8Array,
): Promise<Readonly<{ value: T; digest: string }>> {
  const bytes = await readBoundedRegularFile(candidate, MAX_RECORD_BYTES);
  const value = parse(JSON.parse(decoder.decode(bytes)) as unknown);
  if (!equalBytes(bytes, encode(value))) throw new Error(`Vendor record is not canonical: ${candidate}`);
  return Object.freeze({ value, digest: sha256ContentDigest(bytes) });
}

async function readBoundedRegularFile(candidate: string, maxBytes: number): Promise<Uint8Array> {
  const status = await lstat(candidate, { bigint: true });
  if (!status.isFile() || status.isSymbolicLink() || status.size > BigInt(maxBytes)) {
    throw new Error(`Expected a bounded non-symlink regular file: ${candidate}`);
  }
  const handle = await open(candidate, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = await handle.stat({ bigint: true });
    if (!opened.isFile() || opened.dev !== status.dev || opened.ino !== status.ino || opened.size !== status.size) {
      throw new Error(`File identity changed while reading: ${candidate}`);
    }
    return new Uint8Array(await handle.readFile());
  } finally {
    await handle.close();
  }
}

function parseDeclaration(input: unknown): VendorSourceDeclaration {
  const record = exactRecord(input, ["curationRevision", "destinationPath", "lockPath", "policy", "provenancePath", "refName", "repositoryIdentity", "schemaVersion", "sourceId", "sourcePath", "supportedBaseline"]);
  if (record.schemaVersion !== 1 || (record.policy !== "tracked" && record.policy !== "held")) throw new Error("Invalid vendor declaration protocol");
  const declaration = record as unknown as VendorSourceDeclaration;
  requireString(declaration.sourceId, SOURCE_ID_PATTERN, "sourceId");
  requireString(declaration.repositoryIdentity, REPOSITORY_PATTERN, "repositoryIdentity");
  requireString(declaration.refName, REF_PATTERN, "refName");
  for (const [label, value] of [["sourcePath", declaration.sourcePath], ["destinationPath", declaration.destinationPath], ["provenancePath", declaration.provenancePath], ["lockPath", declaration.lockPath]] as const) requireString(value, PATH_PATTERN, label);
  if (!Number.isSafeInteger(declaration.curationRevision) || declaration.curationRevision < 1) throw new Error("Invalid curationRevision");
  requireBoundedText(declaration.supportedBaseline, "supportedBaseline");
  return Object.freeze({ ...declaration });
}

function parseProvenance(input: unknown): VendorProvenanceRecord {
  const record = exactRecord(input, ["admitted", "curationRevision", "disposition", "importedPayloadDigest", "observedAt", "observedLatest", "schemaVersion", "sourceId", "supportedBaseline"]);
  if (record.schemaVersion !== 1 || !["admitted", "held", "review-required"].includes(String(record.disposition))) throw new Error("Invalid vendor provenance protocol");
  const value = record as unknown as VendorProvenanceRecord;
  requireString(value.sourceId, SOURCE_ID_PATTERN, "sourceId");
  validateIdentity(value.admitted);
  validateIdentity(value.observedLatest);
  requireString(value.importedPayloadDigest, DIGEST_PATTERN, "importedPayloadDigest");
  if (!Number.isSafeInteger(value.curationRevision) || value.curationRevision < 1) throw new Error("Invalid curationRevision");
  requireBoundedText(value.supportedBaseline, "supportedBaseline");
  if (!UTC_PATTERN.test(value.observedAt) || new Date(value.observedAt).toISOString() !== value.observedAt) throw new Error("Invalid observedAt");
  return Object.freeze({ ...value, admitted: Object.freeze({ ...value.admitted }), observedLatest: Object.freeze({ ...value.observedLatest }) });
}

function parseLock(input: unknown): VendorLockRecord {
  const record = exactRecord(input, ["admitted", "schemaVersion", "sourceId"]);
  if (record.schemaVersion !== 1) throw new Error("Invalid vendor lock protocol");
  const value = record as unknown as VendorLockRecord;
  requireString(value.sourceId, SOURCE_ID_PATTERN, "sourceId");
  validateIdentity(value.admitted);
  return Object.freeze({ ...value, admitted: Object.freeze({ ...value.admitted }) });
}

function validateIdentity(value: VendorSourceIdentity): void {
  if (!exactKeys(value, ["payloadDigest", "refName", "repositoryIdentity", "sourceCommit", "sourceTree"])) throw new Error("Invalid vendor identity shape");
  requireString(value.repositoryIdentity, REPOSITORY_PATTERN, "repositoryIdentity");
  requireString(value.refName, REF_PATTERN, "refName");
  requireString(value.sourceCommit, OBJECT_PATTERN, "sourceCommit");
  requireString(value.sourceTree, OBJECT_PATTERN, "sourceTree");
  requireString(value.payloadDigest, DIGEST_PATTERN, "payloadDigest");
}

function encodeDeclaration(value: VendorSourceDeclaration): Uint8Array { return canonicalJsonBytes(value); }
function encodeProvenance(value: VendorProvenanceRecord): Uint8Array { return canonicalJsonBytes(value); }
function encodeLock(value: VendorLockRecord): Uint8Array { return canonicalJsonBytes(value); }

function binding(input: Readonly<{ id: string; protocol: string; contentDigest: string }>, protocol: VendorRecordBinding["protocol"]): VendorRecordBinding {
  if (input.protocol !== protocol) throw new Error("Vendor binding uses the wrong protocol");
  requireString(input.id, PATH_PATTERN, "binding.id");
  requireString(input.contentDigest, DIGEST_PATTERN, "binding.contentDigest");
  return Object.freeze({ id: input.id, protocol, contentDigest: input.contentDigest });
}

function sourceSnapshotValue(source: VendorDeclaredSourceObservation) {
  return {
    declaration: source.declarationContentDigest,
    destination: source.destination,
    lock: source.lockContentDigest,
    memberPluginId: source.memberPluginId,
    provenance: source.provenanceContentDigest,
  };
}

function bindingKey(owner: string, input: Readonly<{ id: string; protocol: string }>): string {
  return `${owner}\0${input.protocol}\0${input.id}`;
}

function planIdentity(plan: VendorAuthoringPlan): string {
  return sha256ContentDigest(canonicalJsonBytes({
    expectedSnapshotDigest: plan.expectedSnapshotDigest,
    paths: plan.changedPaths,
    workspace: plan.contentWorkspace,
  }));
}

function resolveContained(root: string, relative: string): string {
  if (!PATH_PATTERN.test(relative)) throw new Error(`Repository path is not canonical: ${relative}`);
  const candidate = path.join(root, ...relative.split("/"));
  const offset = path.relative(root, candidate);
  if (offset === "" || offset === ".." || offset.startsWith(`..${path.sep}`) || path.isAbsolute(offset)) {
    throw new Error("Repository path escapes or aliases the workspace root");
  }
  return candidate;
}

async function gitText(git: GitCommandRunner, root: string, args: readonly string[]): Promise<string> {
  const result = await git.run(root, args, { stdoutBytes: 1024 * 1024 });
  if (result.exitCode !== 0) throw new Error(decoder.decode(result.stderr).trim() || `Git ${args[0]} failed`);
  return decoder.decode(result.stdout).trim();
}

function exactRecord(input: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!exactKeys(input, keys)) throw new Error("Vendor record has an open or invalid shape");
  return input as Record<string, unknown>;
}

function exactKeys(input: unknown, keys: readonly string[]): boolean {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  const actual = Object.keys(input).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function requireString(value: unknown, pattern: RegExp, label: string): asserts value is string {
  if (typeof value !== "string" || !pattern.test(value)) throw new Error(`Invalid ${label}`);
}

function requireBoundedText(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 512 || /[\u0000-\u001f\u007f]/u.test(value)) throw new Error(`Invalid ${label}`);
}

function invalid(code: VendorUpdateIssue["code"], detail: string) {
  return Object.freeze({ kind: "Invalid" as const, issues: Object.freeze([Object.freeze({ code, detail })]) as readonly [VendorUpdateIssue] });
}

function hasCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === code;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
