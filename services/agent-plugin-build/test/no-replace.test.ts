import { lstat, mkdir } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createBunFfiNoReplacePublisher,
  type NativeRename,
} from "../src/artifact-store/no-replace-publisher";
import {
  createOwnedFixtureRoot,
  removeOwnedFixtureRoot,
  type OwnedFixtureRoot,
} from "./owned-fixture-root";

describe("fd-relative no-replace publication", () => {
  let fixture: OwnedFixtureRoot | undefined;

  afterEach(async () => {
    if (fixture !== undefined) await removeOwnedFixtureRoot(fixture);
    fixture = undefined;
  });

  it("selects Linux renameat2 RENAME_NOREPLACE and inherited directory fds", async () => {
    const paths = await createPublicationPaths();
    let observed: Parameters<NativeRename>[0] | undefined;
    const publisher = createBunFfiNoReplacePublisher({
      platform: "linux",
      nativeRename(call) {
        observed = call;
        return { returnCode: 0, errno: 0 };
      },
    });
    const result = await publisher.publish(paths.publication);
    expect(result).toEqual({ kind: "Published" });
    expect(observed).toMatchObject({ platform: "linux", flags: 1 });
    expect(observed!.sourceParentFd).toBeGreaterThan(2);
    expect(observed!.destinationParentFd).toBeGreaterThan(2);
    expect(new TextDecoder().decode(observed!.sourceName)).toBe("candidate\0");
    expect(new TextDecoder().decode(observed!.destinationName)).toBe("digest\0");
  });

  it("combines Darwin RENAME_EXCL with RENAME_NOFOLLOW_ANY", async () => {
    const paths = await createPublicationPaths();
    let observed: Parameters<NativeRename>[0] | undefined;
    const publisher = createBunFfiNoReplacePublisher({
      platform: "darwin",
      nativeRename(call) {
        observed = call;
        return { returnCode: 0, errno: 0 };
      },
    });
    await expect(publisher.publish(paths.publication)).resolves.toEqual({ kind: "Published" });
    expect(observed).toMatchObject({ platform: "darwin", flags: 0x14 });
  });

  it("maps unsupported and unknown syscall outcomes without a rename fallback", async () => {
    const paths = await createPublicationPaths();
    const unsupported = createBunFfiNoReplacePublisher({
      platform: "linux",
      nativeRename: () => ({ returnCode: -1, errno: 95 }),
    });
    await expect(unsupported.publish(paths.publication)).resolves.toMatchObject({ kind: "Unsupported" });

    const unknown = createBunFfiNoReplacePublisher({
      platform: "linux",
      nativeRename: () => ({ returnCode: -1, errno: 5 }),
    });
    await expect(unknown.publish(paths.publication)).resolves.toMatchObject({ kind: "Unknown", errno: 5 });

    const absent = createBunFfiNoReplacePublisher({ platform: "freebsd" });
    await expect(absent.publish(paths.publication)).resolves.toMatchObject({ kind: "Unsupported" });
  });

  it.runIf(process.platform === "darwin" && "Bun" in globalThis)(
    "publishes with Darwin exclusive no-follow rename and preserves a collision",
    async () => {
      const paths = await createPublicationPaths();
      const publisher = createBunFfiNoReplacePublisher({ platform: "darwin" });
      await expect(publisher.publish(paths.publication)).resolves.toEqual({ kind: "Published" });
      await expect(lstat(paths.sourcePath)).rejects.toMatchObject({ code: "ENOENT" });
      await expect(lstat(paths.destinationPath)).resolves.toMatchObject({ isDirectory: expect.any(Function) });

      await mkdir(paths.sourcePath, { mode: 0o700 });
      const source = await lstat(paths.sourcePath, { bigint: true });
      await expect(publisher.publish({
        ...paths.publication,
        expectedSource: { dev: source.dev, ino: source.ino },
      })).resolves.toEqual({ kind: "Occupied" });
      await expect(lstat(paths.sourcePath)).resolves.toMatchObject({ isDirectory: expect.any(Function) });
      await expect(lstat(paths.destinationPath)).resolves.toMatchObject({ isDirectory: expect.any(Function) });
    },
  );

  async function createPublicationPaths() {
    fixture = await createOwnedFixtureRoot();
    const sourceParent = join(fixture.path, "source");
    const destinationParent = join(fixture.path, "destination");
    await mkdir(sourceParent, { mode: 0o700 });
    await mkdir(destinationParent, { mode: 0o700 });
    const sourcePath = join(sourceParent, "candidate");
    const destinationPath = join(destinationParent, "digest");
    await mkdir(sourcePath, { mode: 0o700 });
    const source = await lstat(sourcePath, { bigint: true });
    return {
      sourcePath,
      destinationPath,
      publication: {
        sourcePath,
        destinationPath,
        expectedSource: { dev: source.dev, ino: source.ino },
      },
    };
  }
});
