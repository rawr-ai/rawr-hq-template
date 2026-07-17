import type { BigIntStats } from "node:fs";
import { lstat, mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { ExportLifecycleRuntime } from "@rawr/agent-plugin-lifecycle/ports/exports";

import {
  createExportLifecycleRuntime,
  nodeExportDestinationRuntime,
} from "../../../src/lib/agent-plugins/bindings/export-destination";

const FIXTURE_PREFIX = "rawr-export-binding-test-";

interface OwnedRoot {
  readonly path: string;
  readonly parent: string;
  readonly dev: bigint;
  readonly ino: bigint;
}

const roots: OwnedRoot[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) await cleanupRoot(root);
});

describe("export destination CLI binding", () => {
  it("adds exactly the selected node resource without changing service dependencies", () => {
    const dependencies: Omit<ExportLifecycleRuntime, "destinationRuntime"> = {
      artifactReader: { read: async (ref) => Object.freeze({ kind: "Missing", ref }) },
      knownNativeHomesReader: {
        readCompleteSnapshot: async () => Promise.reject(new Error("unused native-home reader")),
      },
      undoWriter: {
        preflight: async () => Promise.reject(new Error("unused undo preflight")),
        begin: async () => Promise.reject(new Error("unused undo begin")),
      },
    };

    const runtime = createExportLifecycleRuntime(dependencies);
    expect(runtime.destinationRuntime).toBe(nodeExportDestinationRuntime);
    expect(runtime.artifactReader).toBe(dependencies.artifactReader);
    expect(runtime.knownNativeHomesReader).toBe(dependencies.knownNativeHomesReader);
    expect(runtime.undoWriter).toBe(dependencies.undoWriter);
  });

  it("projects the resource receipts without planning or filesystem logic in the binding", async () => {
    const root = await createRoot();
    const capture = await nodeExportDestinationRuntime.capture({
      destination: root.path,
      readToken: "binding-read",
      paths: ["plugin", "plugin/SKILL.md"],
      maxEntries: 8,
      maxBytes: 1024,
    });
    const applied = await nodeExportDestinationRuntime.apply({
      destination: root.path,
      planDigest: "binding-plan",
      readToken: capture.readToken,
      captureHandle: capture.handle,
      mutations: [
        { kind: "EnsureDirectory", path: "plugin", mode: 0o755 },
        { kind: "WriteFile", path: "plugin/SKILL.md", mode: 0o644, bytes: new TextEncoder().encode("bound\n") },
      ],
    });
    expect(applied.changedPaths).toEqual(["plugin", "plugin/SKILL.md"]);
    expect(applied.entries.map((entry) => entry.kind)).toEqual(["Directory", "File"]);
    expect(await readFile(join(root.path, "plugin/SKILL.md"), "utf8")).toBe("bound\n");

    await nodeExportDestinationRuntime.restore({
      destination: root.path,
      planDigest: "binding-plan",
      readToken: capture.readToken,
      captureHandle: capture.handle,
    });
    await nodeExportDestinationRuntime.settle({
      destination: root.path,
      planDigest: "binding-plan",
      readToken: capture.readToken,
      captureHandle: capture.handle,
    });
    await expect(lstat(join(root.path, "plugin"))).rejects.toMatchObject({ code: "ENOENT" });
  });
});

async function createRoot(): Promise<OwnedRoot> {
  const path = await realpath(await mkdtemp(join(tmpdir(), FIXTURE_PREFIX)));
  const info = await lstat(path, { bigint: true });
  const root = Object.freeze({ path, parent: dirname(path), dev: info.dev, ino: info.ino });
  roots.push(root);
  return root;
}

async function cleanupRoot(root: OwnedRoot): Promise<void> {
  const info: BigIntStats = await lstat(root.path, { bigint: true });
  if (
    dirname(root.path) !== root.parent
    || !root.path.includes(`/${FIXTURE_PREFIX}`)
    || !info.isDirectory()
    || info.isSymbolicLink()
    || info.dev !== root.dev
    || info.ino !== root.ino
  ) throw new Error(`Refusing to clean unowned export binding fixture: ${root.path}`);
  await rm(root.path, { recursive: true, force: false });
}
