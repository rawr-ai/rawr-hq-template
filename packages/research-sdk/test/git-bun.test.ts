import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  readlink,
  realpath,
  rename,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { Cause, Effect, Exit, Fiber, Layer, Option } from "effect";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  type ArtifactPathMapping,
  type ExactGitRevision,
  GitBun,
  type GitBunError,
  type GitPatchSubstrateIdentity,
  gitRepositoryIdentity,
  makeGitBunLayer,
  type PackedPackageDescriptor,
  type PatchDescriptor,
} from "../src/adapters/git-bun/index.js";
import { deriveRuntimeGraph } from "../src/adapters/git-bun/installed-package.js";
import type { ProcessTerminationUnconfirmed } from "../src/contracts/index.js";
import {
  BunCommandProcessLayer,
  CommandProcess,
  type CommandProcessShape,
  type CommandRequest,
  type CommandResult,
  makeResearchProcessRuntime,
  type ResearchProcessRuntime,
} from "../src/runtime/index.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const expectedGitVersion = "2.48.0";
const expectedBunVersion = "1.3.14";
const expectedBunRevision = "0d9b296af33f2b851fcbf4df3e9ec89751734ba4";
const pathMapping = {
  submit: [{ kind: "Tree", path: "src" }],
  ignore: [{ kind: "Tree", path: "ignored" }],
} as const satisfies ArtifactPathMapping;

interface GitFixture {
  readonly root: string;
  readonly revision: ExactGitRevision;
  readonly baseline: {
    readonly binary: Uint8Array;
    readonly crlf: Uint8Array;
  };
}

interface ChangedProduct {
  readonly root: string;
  readonly capture: {
    readonly descriptor: PatchDescriptor;
    readonly bytes: Uint8Array;
  };
}

let runRoot = "";
let scratchRoot = "";
let repositoryRoot = "";
let repositoryGuardBefore: RepositoryGuard | undefined;
let gitBinary = "";
let bunBinary = "";
let runtime: ResearchProcessRuntime<GitBun, GitBunError>;
let gitFixture: GitFixture;
let changedProductPromise: Promise<ChangedProduct> | undefined;

describe.sequential("Git/Bun research artifact boundary", () => {
  beforeAll(async () => {
    repositoryRoot = await realpath(join(import.meta.dirname, "..", "..", ".."));
    runRoot = await realpath(await mkdtemp(join(tmpdir(), "rawr-research-sdk-git-bun-")));
    scratchRoot = join(runRoot, "adapter-scratch");
    await mkdir(scratchRoot);
    scratchRoot = await realpath(scratchRoot);

    const discoveredGit = Bun.which("git");
    if (discoveredGit === null) {
      throw new Error("The exact Git test substrate is unavailable.");
    }
    gitBinary = await realpath(discoveredGit);
    bunBinary = await realpath(process.execPath);
    repositoryGuardBefore = await repositoryGuard(repositoryRoot);

    runtime = makeResearchProcessRuntime(
      makeGitBunLayer(gitBunConfig(scratchRoot)).pipe(Layer.provide(BunCommandProcessLayer))
    );
    gitFixture = await createGitFixture(join(runRoot, "source-repository"));
  }, 60_000);

  afterAll(async () => {
    await runtime?.dispose();
    if (runRoot.length > 0) {
      await rm(runRoot, { recursive: true, force: true });
    }
    if (repositoryGuardBefore !== undefined) {
      expect(await repositoryGuard(repositoryRoot)).toEqual(repositoryGuardBefore);
    }
  }, 60_000);

  test("exposes one immutable five-operation artifact service", () => {
    return runAdapter(
      Effect.map(GitBun, (service) => {
        expect(Object.isFrozen(service)).toBe(true);
        expect(service.materializeRevision).toBeTypeOf("function");
        expect(service.capturePatch).toBeTypeOf("function");
        expect(service.applyAndRegenerate).toBeTypeOf("function");
        expect(service.packSdkPackage).toBeTypeOf("function");
        expect(service.verifyInstalledSdkPackage).toBeTypeOf("function");
      })
    );
  });

  test("admits only the tool that owns each artifact operation", async () => {
    const gitScratch = join(runRoot, "git-only-scratch");
    await mkdir(gitScratch);
    const gitOnlyRuntime = makeResearchProcessRuntime(
      makeGitBunLayer({
        ...gitBunConfig(await realpath(gitScratch)),
        bun: {
          executable: join(runRoot, "missing-non-owning-bun"),
          expectedVersion: "unavailable",
          expectedRevision: "unavailable",
        },
      }).pipe(Layer.provide(BunCommandProcessLayer))
    );
    try {
      const destinationPath = join(runRoot, "git-only-product");
      const materializeExit = await gitOnlyRuntime.runPromiseExit(
        Effect.flatMap(GitBun, (service) =>
          service.materializeRevision({
            sourceRepositoryPath: gitFixture.root,
            revision: gitFixture.revision,
            destinationPath,
          })
        )
      );
      expect(Exit.isSuccess(materializeExit)).toBe(true);
      await expect(readFile(join(destinationPath, "src", "text.txt"), "utf8")).resolves.toBe(
        "baseline text\n"
      );
      await writeFile(join(destinationPath, "src", "text.txt"), "git-only product\n");
      const captureExit = await gitOnlyRuntime.runPromiseExit(
        Effect.flatMap(GitBun, (service) =>
          service.capturePatch({
            sourceRepositoryPath: gitFixture.root,
            baseline: gitFixture.revision,
            terminalProductPath: destinationPath,
            pathMapping,
          })
        )
      );
      expect(Exit.isSuccess(captureExit)).toBe(true);
      if (Exit.isFailure(captureExit)) {
        throw new Error("The Git-only capture unexpectedly failed.");
      }
      const reconstructedPath = join(runRoot, "git-only-reconstructed");
      const applyExit = await gitOnlyRuntime.runPromiseExit(
        Effect.flatMap(GitBun, (service) =>
          service.applyAndRegenerate({
            sourceRepositoryPath: gitFixture.root,
            baseline: gitFixture.revision,
            descriptor: captureExit.value.descriptor,
            patchBytes: captureExit.value.bytes,
            pathMapping,
            productPath: reconstructedPath,
          })
        )
      );
      expect(Exit.isSuccess(applyExit)).toBe(true);
      await expect(readFile(join(reconstructedPath, "src", "text.txt"), "utf8")).resolves.toBe(
        "git-only product\n"
      );
    } finally {
      await gitOnlyRuntime.dispose();
    }

    const packageFixture = await createPackageFixture(
      join(runRoot, "bun-only-package-fixture"),
      false
    );
    const bunScratch = join(runRoot, "bun-only-scratch");
    const outputPath = join(runRoot, "artifacts", "bun-only-sdk.tgz");
    await Promise.all([mkdir(bunScratch), mkdir(dirname(outputPath), { recursive: true })]);
    const bunOnlyRuntime = makeResearchProcessRuntime(
      makeGitBunLayer({
        ...gitBunConfig(await realpath(bunScratch)),
        git: {
          executable: join(runRoot, "missing-non-owning-git"),
          expectedVersion: "unavailable",
        },
      }).pipe(Layer.provide(BunCommandProcessLayer))
    );
    try {
      const packExit = await bunOnlyRuntime.runPromiseExit(
        Effect.flatMap(GitBun, (service) =>
          service.packSdkPackage({
            workspaceRoot: packageFixture.workspaceRoot,
            packageRoot: packageFixture.packageRoot,
            protocolVersion: "fixture-protocol-1",
            outputPath,
          })
        )
      );
      expect(Exit.isSuccess(packExit)).toBe(true);
      if (Exit.isFailure(packExit)) {
        throw new Error("The Bun-only pack unexpectedly failed.");
      }
      await expect(pathExists(outputPath)).resolves.toBe(true);
      const consumer = join(runRoot, "bun-only-consumer");
      await mkdir(consumer);
      await writeJson(join(consumer, "package.json"), {
        name: "bun-only-consumer",
        version: "1.0.0",
        private: true,
        dependencies: { "@rawr/research-sdk": `file:${outputPath}` },
      });
      await runHost(bunBinary, ["install", "--offline", "--ignore-scripts"], consumer);
      const installedRoot = await realpath(join(consumer, "node_modules", "@rawr", "research-sdk"));
      const verifyExit = await bunOnlyRuntime.runPromiseExit(
        Effect.flatMap(GitBun, (service) =>
          service.verifyInstalledSdkPackage({
            workspaceRoot: consumer,
            packageRoot: installedRoot,
            artifactPath: outputPath,
            expected: packExit.value,
          })
        )
      );
      expect(Exit.isSuccess(verifyExit)).toBe(true);
    } finally {
      await bunOnlyRuntime.dispose();
    }
  }, 60_000);

  test("fails closed on drift in the owning tool without consulting the other tool", async () => {
    const gitScratch = join(runRoot, "wrong-git-scratch");
    await mkdir(gitScratch);
    const wrongGitRuntime = makeResearchProcessRuntime(
      makeGitBunLayer({
        ...gitBunConfig(await realpath(gitScratch)),
        git: {
          executable: gitBinary,
          expectedVersion: "0.0.0-wrong",
        },
        bun: {
          executable: join(runRoot, "missing-drift-probe-bun"),
          expectedVersion: "unavailable",
          expectedRevision: "unavailable",
        },
      }).pipe(Layer.provide(BunCommandProcessLayer))
    );
    try {
      const exit = await wrongGitRuntime.runPromiseExit(
        Effect.flatMap(GitBun, (service) =>
          service.materializeRevision({
            sourceRepositoryPath: gitFixture.root,
            revision: gitFixture.revision,
            destinationPath: join(runRoot, "wrong-git-product"),
          })
        )
      );
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        throw new Error("The wrong Git identity unexpectedly passed.");
      }
      expect(Option.getOrThrow(Cause.findErrorOption(exit.cause))).toEqual(
        expect.objectContaining({ kind: "GitBunIdentityMismatch" })
      );
    } finally {
      await wrongGitRuntime.dispose();
    }

    const bunScratch = join(runRoot, "wrong-bun-scratch");
    await mkdir(bunScratch);
    const wrongBunRuntime = makeResearchProcessRuntime(
      makeGitBunLayer({
        ...gitBunConfig(await realpath(bunScratch)),
        git: {
          executable: join(runRoot, "missing-drift-probe-git"),
          expectedVersion: "unavailable",
        },
        bun: {
          executable: bunBinary,
          expectedVersion: expectedBunVersion,
          expectedRevision: "0".repeat(expectedBunRevision.length),
        },
      }).pipe(Layer.provide(BunCommandProcessLayer))
    );
    try {
      const exit = await wrongBunRuntime.runPromiseExit(
        Effect.flatMap(GitBun, (service) =>
          service.packSdkPackage({
            workspaceRoot: runRoot,
            packageRoot: runRoot,
            protocolVersion: "unreachable",
            outputPath: join(runRoot, "wrong-bun.tgz"),
          })
        )
      );
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        throw new Error("The wrong Bun identity unexpectedly passed.");
      }
      expect(Option.getOrThrow(Cause.findErrorOption(exit.cause))).toEqual(
        expect.objectContaining({ kind: "GitBunIdentityMismatch" })
      );
    } finally {
      await wrongBunRuntime.dispose();
    }
  });

  test("materializes the exact history-free revision despite hostile repository policy", async () => {
    const product = join(runRoot, "history-free-product");
    await materialize(product);

    await expect(pathExists(join(product, ".git"))).resolves.toBe(false);
    await expect(readFile(join(product, "src", "text.txt"), "utf8")).resolves.toBe(
      "baseline text\n"
    );
    expect(await readFile(join(product, "src", "crlf.crlf"))).toEqual(
      Buffer.from(gitFixture.baseline.crlf)
    );
    expect(await readFile(join(product, "src", "binary.bin"))).toEqual(
      Buffer.from(gitFixture.baseline.binary)
    );
    expect((await lstat(join(product, "src", "executable.sh"))).mode & 0o111).not.toBe(0);
    await expect(readlink(join(product, "src", "safe-link"))).resolves.toBe("text.txt");
    await expect(readFile(join(product, "src", "spaced name.txt"), "utf8")).resolves.toBe(
      "space baseline\n"
    );
    await expect(readFile(join(product, "src", "café.txt"), "utf8")).resolves.toBe(
      "unicode baseline\n"
    );
  });

  test("captures one canonical product patch and reconstructs its exact product tree", async () => {
    const changed = await changedProduct();
    const { descriptor, bytes } = changed.capture;
    expect(descriptor.kind).toBe("Captured");
    expect(bytes.byteLength).toBeGreaterThan(0);
    expect(descriptor.substrate.git).toEqual({
      resolvedBinary: gitBinary,
      version: expectedGitVersion,
    });
    expect(descriptor.substrate.canonicalization.attributesPolicy).toContain("!filter");
    expect(descriptor.substrate.canonicalization.diffArguments).toContain("--no-renames");
    expect(Object.isFrozen(descriptor.substrate)).toBe(true);
    expect(Object.isFrozen(descriptor.substrate.git)).toBe(true);
    expect(Object.isFrozen(descriptor.substrate.canonicalization)).toBe(true);

    const patchText = decoder.decode(bytes);
    expect(patchText).not.toContain("rename from");
    expect(patchText).not.toContain("rename to");
    expect(patchText).toContain("GIT binary patch");

    const reconstructed = join(runRoot, "reconstructed-product");
    await runAdapter(
      Effect.flatMap(GitBun, (service) =>
        service.applyAndRegenerate({
          sourceRepositoryPath: gitFixture.root,
          baseline: gitFixture.revision,
          descriptor,
          patchBytes: bytes,
          pathMapping,
          productPath: reconstructed,
        })
      )
    );

    await expect(readFile(join(reconstructed, "src", "text.txt"), "utf8")).resolves.toBe(
      "product text\n"
    );
    expect(await readFile(join(reconstructed, "src", "crlf.crlf"))).toEqual(
      Buffer.from("line one\r\nline two product\r\n")
    );
    expect(await readFile(join(reconstructed, "src", "binary.bin"))).toEqual(
      Buffer.from([0, 255, 16, 32, 64, 128, 7])
    );
    await expect(pathExists(join(reconstructed, "src", "delete.txt"))).resolves.toBe(false);
    await expect(pathExists(join(reconstructed, "src", "rename-source.txt"))).resolves.toBe(false);
    await expect(readFile(join(reconstructed, "src", "renamed.txt"), "utf8")).resolves.toBe(
      "rename baseline\n"
    );
    await expect(readFile(join(reconstructed, "src", "added.txt"), "utf8")).resolves.toBe(
      "new product file\n"
    );
    await expect(
      readFile(join(reconstructed, "src", "ignored-by-source-policy.txt"), "utf8")
    ).resolves.toBe("submitted despite source ignore policy\n");
    expect((await lstat(join(reconstructed, "src", "executable.sh"))).mode & 0o111).toBe(0);
    await expect(readFile(join(reconstructed, "src", "spaced name.txt"), "utf8")).resolves.toBe(
      "space product\n"
    );
    await expect(readFile(join(reconstructed, "src", "café.txt"), "utf8")).resolves.toBe(
      "unicode product\n"
    );
    await expect(readlink(join(reconstructed, "src", "safe-link"))).resolves.toBe("text.txt");

    // Ignored solver state is not part of the submitted product artifact.
    await expect(readFile(join(reconstructed, "ignored", "run.log"), "utf8")).resolves.toBe(
      "ignored baseline\n"
    );
    await expect(pathExists(join(reconstructed, "ignored", "new.log"))).resolves.toBe(false);
  }, 30_000);

  test("rejects hidden Git metadata, changes outside authority, and submitted symbolic links", async () => {
    const metadataProduct = join(runRoot, "metadata-product");
    await materialize(metadataProduct);
    await mkdir(join(metadataProduct, ".git"));
    await writeFile(join(metadataProduct, ".git", "config"), "[core]\n\tbare = false\n");
    const metadataFailure = await runAdapterFailure(
      Effect.flatMap(GitBun, (service) =>
        service.capturePatch({
          sourceRepositoryPath: gitFixture.root,
          baseline: gitFixture.revision,
          terminalProductPath: metadataProduct,
          pathMapping,
        })
      )
    );
    expect(metadataFailure).toEqual(expect.objectContaining({ kind: "GitBunIdentityMismatch" }));

    const protectedProduct = join(runRoot, "protected-product");
    await materialize(protectedProduct);
    await writeFile(join(protectedProduct, "protected", "authority.txt"), "mutated\n");

    const protectedFailure = await runAdapterFailure(
      Effect.flatMap(GitBun, (service) =>
        service.capturePatch({
          sourceRepositoryPath: gitFixture.root,
          baseline: gitFixture.revision,
          terminalProductPath: protectedProduct,
          pathMapping,
        })
      )
    );
    expect(protectedFailure).toEqual(expect.objectContaining({ kind: "GitBunIdentityMismatch" }));

    const symlinkProduct = join(runRoot, "submitted-symlink-product");
    await materialize(symlinkProduct);
    await symlink("text.txt", join(symlinkProduct, "src", "new-link"));
    const symlinkFailure = await runAdapterFailure(
      Effect.flatMap(GitBun, (service) =>
        service.capturePatch({
          sourceRepositoryPath: gitFixture.root,
          baseline: gitFixture.revision,
          terminalProductPath: symlinkProduct,
          pathMapping,
        })
      )
    );
    expect(symlinkFailure).toEqual(expect.objectContaining({ kind: "GitBunIdentityMismatch" }));
  }, 30_000);

  test("fails closed on a different mapping, baseline, substrate, or patch payload", async () => {
    const { descriptor, bytes } = (await changedProduct()).capture;
    const differentMapping = {
      submit: [{ kind: "Exact", path: "src/text.txt" }],
      ignore: [{ kind: "Tree", path: "ignored" }],
    } as const satisfies ArtifactPathMapping;
    const wrongRevision: ExactGitRevision = {
      ...gitFixture.revision,
      repositoryIdentity: {
        ...gitFixture.revision.repositoryIdentity,
        value: "0".repeat(64),
      },
    };
    const wrongSubstrate: GitPatchSubstrateIdentity = {
      ...descriptor.substrate,
      configurationDigest: {
        ...descriptor.substrate.configurationDigest,
        value: "0".repeat(64),
      },
    };
    const wrongSubstrateDescriptor = {
      ...descriptor,
      substrate: wrongSubstrate,
    } satisfies PatchDescriptor;
    const tampered = bytes.slice();
    const tamperedIndex = Math.max(0, tampered.byteLength - 1);
    tampered[tamperedIndex] = (tampered[tamperedIndex] ?? 0) ^ 1;

    const failures = await Promise.all([
      rejectApply("wrong-mapping", descriptor, bytes, differentMapping, gitFixture.revision),
      rejectApply("wrong-baseline", descriptor, bytes, pathMapping, wrongRevision),
      rejectApply(
        "wrong-substrate",
        wrongSubstrateDescriptor,
        bytes,
        pathMapping,
        gitFixture.revision
      ),
      rejectApply("tampered-patch", descriptor, tampered, pathMapping, gitFixture.revision),
    ]);

    expect(failures).toEqual(
      failures.map(() => expect.objectContaining({ kind: "GitBunIdentityMismatch" }))
    );
  }, 30_000);

  test("represents an unchanged product as an empty patch and round-trips it", async () => {
    const unchanged = join(runRoot, "unchanged-product");
    await materialize(unchanged);
    const capture = await runAdapter(
      Effect.flatMap(GitBun, (service) =>
        service.capturePatch({
          sourceRepositoryPath: gitFixture.root,
          baseline: gitFixture.revision,
          terminalProductPath: unchanged,
          pathMapping,
        })
      )
    );

    expect(capture.descriptor.kind).toBe("Empty");
    expect(capture.bytes).toHaveLength(0);
    const reconstructed = join(runRoot, "empty-reconstructed-product");
    await runAdapter(
      Effect.flatMap(GitBun, (service) =>
        service.applyAndRegenerate({
          sourceRepositoryPath: gitFixture.root,
          baseline: gitFixture.revision,
          descriptor: capture.descriptor,
          patchBytes: capture.bytes,
          pathMapping,
          productPath: reconstructed,
        })
      )
    );
  }, 30_000);

  test("keeps command diagnostics parent-owned when an operation fails", async () => {
    const secret = "fixture-secret-must-not-enter-portable-errors";
    const fakeProcess: CommandProcessShape = {
      run(request) {
        const identity = toolIdentityResult(request);
        if (identity !== undefined) {
          return Effect.succeed(identity);
        }
        return Effect.succeed(exited("", 9, secret));
      },
    };
    const isolatedScratch = join(runRoot, "diagnostic-scratch");
    await mkdir(isolatedScratch);
    const diagnosticRuntime = makeResearchProcessRuntime(
      makeGitBunLayer(gitBunConfig(await realpath(isolatedScratch))).pipe(
        Layer.provide(Layer.succeed(CommandProcess, fakeProcess))
      )
    );

    try {
      const exit = await diagnosticRuntime.runPromiseExit(
        Effect.flatMap(GitBun, (service) =>
          service.materializeRevision({
            sourceRepositoryPath: gitFixture.root,
            revision: gitFixture.revision,
            destinationPath: join(runRoot, "unreachable-diagnostic-product"),
          })
        )
      );
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        throw new Error("The diagnostic probe unexpectedly succeeded.");
      }
      const error = Option.getOrThrow(Cause.findErrorOption(exit.cause));
      expect(error).toEqual(
        expect.objectContaining({
          kind: "GitBunOperationFailed",
          exitCode: 9,
          signalCode: null,
          message: "Operation failed; diagnostic content omitted.",
          diagnosticByteLength: encoder.encode(secret).byteLength,
        })
      );
      expect(JSON.stringify(error)).not.toContain(secret);
    } finally {
      await diagnosticRuntime.dispose();
    }
  });

  test("preserves an unconfirmed process termination with its exact locator", async () => {
    const packageFixture = await createPackageFixture(
      join(runRoot, "unconfirmed-package-fixture"),
      false
    );
    const packageIdentityBefore = await callerPackageIdentity(packageFixture);
    const unconfirmed = {
      kind: "ProcessTerminationUnconfirmed",
      processLocator: "sandbox:fixture/process:42",
      requestedSignal: "SIGKILL",
      detailDigest: {
        algorithm: "sha256",
        preimageKind: "fixture.command-termination-detail.v1",
        value: "a".repeat(64),
      },
    } as const satisfies ProcessTerminationUnconfirmed;
    const fakeProcess: CommandProcessShape = {
      run(request) {
        const identity = toolIdentityResult(request);
        return identity === undefined ? Effect.fail(unconfirmed) : Effect.succeed(identity);
      },
    };
    const isolatedScratch = join(runRoot, "unconfirmed-termination-scratch");
    await mkdir(isolatedScratch);
    const unconfirmedRuntime = makeResearchProcessRuntime(
      makeGitBunLayer(gitBunConfig(await realpath(isolatedScratch))).pipe(
        Layer.provide(Layer.succeed(CommandProcess, fakeProcess))
      )
    );

    try {
      const exit = await unconfirmedRuntime.runPromiseExit(
        Effect.flatMap(GitBun, (service) =>
          service.materializeRevision({
            sourceRepositoryPath: gitFixture.root,
            revision: gitFixture.revision,
            destinationPath: join(runRoot, "unconfirmed-product"),
          })
        )
      );
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        throw new Error("The unconfirmed-termination probe unexpectedly succeeded.");
      }
      expect(Option.getOrThrow(Cause.findErrorOption(exit.cause))).toEqual(unconfirmed);
      expect(await readdir(isolatedScratch)).toEqual([]);

      const outputPath = join(runRoot, "artifacts", "unconfirmed-sdk.tgz");
      await mkdir(dirname(outputPath), { recursive: true });
      const packageExit = await unconfirmedRuntime.runPromiseExit(
        Effect.flatMap(GitBun, (service) =>
          service.packSdkPackage({
            workspaceRoot: packageFixture.workspaceRoot,
            packageRoot: packageFixture.packageRoot,
            protocolVersion: "fixture-protocol-1",
            outputPath,
          })
        )
      );
      expect(Exit.isFailure(packageExit)).toBe(true);
      if (Exit.isSuccess(packageExit)) {
        throw new Error("The unconfirmed package process unexpectedly succeeded.");
      }
      expect(Option.getOrThrow(Cause.findErrorOption(packageExit.cause))).toEqual(unconfirmed);
      await expect(pathExists(outputPath)).resolves.toBe(false);
      expect(await callerPackageIdentity(packageFixture)).toEqual(packageIdentityBefore);
      expect(await readdir(isolatedScratch)).toEqual([]);
    } finally {
      await unconfirmedRuntime.dispose();
    }
  }, 60_000);

  test("interruption publishes no product or package and removes operation controls", async () => {
    const packageFixture = await createPackageFixture(
      join(runRoot, "interrupted-package-fixture"),
      false
    );
    const packageIdentityBefore = await callerPackageIdentity(packageFixture);
    let started = Promise.withResolvers<void>();
    const fakeProcess: CommandProcessShape = {
      run(request) {
        const identity = toolIdentityResult(request);
        if (identity !== undefined) {
          return Effect.succeed(identity);
        }
        started.resolve();
        return Effect.never;
      },
    };
    const isolatedScratch = join(runRoot, "interruption-scratch");
    await mkdir(isolatedScratch);
    const interruptionRuntime = makeResearchProcessRuntime(
      makeGitBunLayer(gitBunConfig(await realpath(isolatedScratch))).pipe(
        Layer.provide(Layer.succeed(CommandProcess, fakeProcess))
      )
    );

    try {
      const productPath = join(runRoot, "interrupted-product");
      const gitExit = await interruptionRuntime.runPromiseExit(
        Effect.gen(function* () {
          const service = yield* GitBun;
          const fiber = yield* Effect.forkChild(
            service.materializeRevision({
              sourceRepositoryPath: gitFixture.root,
              revision: gitFixture.revision,
              destinationPath: productPath,
            })
          );
          yield* Effect.promise(() => started.promise);
          return yield* Fiber.interrupt(fiber);
        })
      );
      expect(Exit.isSuccess(gitExit)).toBe(true);
      await expect(pathExists(productPath)).resolves.toBe(false);
      expect(await readdir(isolatedScratch)).toEqual([]);

      started = Promise.withResolvers<void>();
      const outputPath = join(runRoot, "artifacts", "interrupted-sdk.tgz");
      await mkdir(dirname(outputPath), { recursive: true });
      const packageExit = await interruptionRuntime.runPromiseExit(
        Effect.gen(function* () {
          const service = yield* GitBun;
          const fiber = yield* Effect.forkChild(
            service.packSdkPackage({
              workspaceRoot: packageFixture.workspaceRoot,
              packageRoot: packageFixture.packageRoot,
              protocolVersion: "fixture-protocol-1",
              outputPath,
            })
          );
          yield* Effect.promise(() => started.promise);
          return yield* Fiber.interrupt(fiber);
        })
      );
      expect(Exit.isSuccess(packageExit)).toBe(true);
      await expect(pathExists(outputPath)).resolves.toBe(false);
      await expect(
        pathExists(join(packageFixture.packageRoot, "dist", "research-sdk-runtime-graph.json"))
      ).resolves.toBe(false);
      expect(await callerPackageIdentity(packageFixture)).toEqual(packageIdentityBefore);
      expect(await readdir(isolatedScratch)).toEqual([]);
    } finally {
      await interruptionRuntime.dispose();
    }
  }, 60_000);

  test("rolls back package publication when interruption arrives during outer cleanup", async () => {
    const fixture = await createPackageFixture(
      join(runRoot, "publication-interruption-package-fixture"),
      false
    );
    await writeFile(
      join(fixture.packageRoot, "build.ts"),
      [
        'import { mkdir } from "node:fs/promises";',
        'await mkdir("dist", { recursive: true });',
        'await Bun.write("dist/index.js", "export const fixture = true;\\n");',
        'await Bun.write("dist/index.d.ts", "export declare const fixture: true;\\n");',
        "const cleanupRoot = `${process.env.HOME}/cleanup-load`;",
        "await mkdir(cleanupRoot, { recursive: true });",
        "for (let index = 0; index < 10_000; index += 1) {",
        "  await Bun.write(`${cleanupRoot}/${index}.txt`, 'x');",
        "}",
      ].join("\n")
    );
    const outputPath = join(runRoot, "artifacts", "publication-interruption-sdk.tgz");
    await mkdir(dirname(outputPath), { recursive: true });

    const outerExit = await runtime.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* GitBun;
        const fiber = yield* Effect.forkChild(
          service.packSdkPackage({
            workspaceRoot: fixture.workspaceRoot,
            packageRoot: fixture.packageRoot,
            protocolVersion: "fixture-protocol-1",
            outputPath,
          })
        );
        yield* Effect.promise(() => waitForPath(outputPath, 60_000));
        yield* Fiber.interrupt(fiber);
        return yield* Fiber.await(fiber);
      })
    );

    expect(Exit.isSuccess(outerExit)).toBe(true);
    if (Exit.isFailure(outerExit)) {
      throw new Error("The publication interruption probe failed outside its child fiber.");
    }
    expect(Exit.isFailure(outerExit.value)).toBe(true);
    await expect(pathExists(outputPath)).resolves.toBe(false);
    expect(await readdir(scratchRoot)).toEqual([]);
  }, 120_000);

  test("builds, packs, embeds, and verifies one exact installed registry closure", async () => {
    const fixture = await createPackageFixture(join(runRoot, "package-fixture"), false);
    await mkdir(join(fixture.packageRoot, "dist"));
    await writeFile(
      join(fixture.packageRoot, "dist", "stale-output.js"),
      "export const stale = true;\n"
    );
    const callerIdentityBefore = await callerPackageIdentity(fixture);
    const outputPath = join(runRoot, "artifacts", "fixture-research-sdk.tgz");
    const descriptor = await packFixture(fixture, outputPath);
    expect(await callerPackageIdentity(fixture)).toEqual(callerIdentityBefore);
    const graph = descriptor.runtimeGraph;
    expect(descriptor.substrate.bun).toEqual({
      resolvedBinary: bunBinary,
      version: expectedBunVersion,
      revision: expectedBunRevision,
    });
    expect(descriptor.substrate.canonicalization.packArguments).toContain("--ignore-scripts");
    expect(Object.isFrozen(descriptor.substrate)).toBe(true);
    expect(Object.isFrozen(descriptor.substrate.bun)).toBe(true);
    expect(Object.isFrozen(descriptor.substrate.canonicalization)).toBe(true);
    expect(graph.nodes.map(({ name }) => name)).toEqual(
      expect.arrayContaining(["@rawr/research-sdk", "effect", "msgpackr", "typebox"])
    );
    const dependencyEdges = graph.nodes.flatMap(({ dependencies }) => dependencies);
    expect(dependencyEdges.some(({ installed }) => installed)).toBe(true);
    expect(dependencyEdges.some(({ installed }) => !installed)).toBe(true);
    expect(descriptor.packageName).toBe("@rawr/research-sdk");
    expect(descriptor.packageVersion).toBe("1.0.0");
    expect(descriptor.protocolVersion).toBe("fixture-protocol-1");
    expect(descriptor.embeddedManifestPath).toBe("dist/research-sdk-runtime-graph.json");
    const immutablePackageBytes = await Bun.file(outputPath).bytes();
    expect(immutablePackageBytes).toHaveLength(descriptor.byteLength);
    await expect(pathExists(join(fixture.packageRoot, "prepack-ran.txt"))).resolves.toBe(false);

    const archive = await new Bun.Archive(immutablePackageBytes).files();
    const embedded = archive.get("package/dist/research-sdk-runtime-graph.json");
    expect(embedded).toBeDefined();
    expect(archive.has("package/dist/stale-output.js")).toBe(false);
    const embeddedValue = JSON.parse(await embedded!.text());
    expect(embeddedValue).toEqual(
      expect.objectContaining({
        schemaVersion: "research-sdk.runtime-graph.v1",
        packageName: "@rawr/research-sdk",
        packageVersion: "1.0.0",
        protocolVersion: "fixture-protocol-1",
        runtimeGraph: graph,
      })
    );

    const replacementFailure = await runAdapterFailure(
      Effect.flatMap(GitBun, (service) =>
        service.packSdkPackage({
          workspaceRoot: fixture.workspaceRoot,
          packageRoot: fixture.packageRoot,
          protocolVersion: "fixture-protocol-1",
          outputPath,
        })
      )
    );
    expect(replacementFailure).toEqual(expect.objectContaining({ kind: "GitBunInvalidInput" }));
    expect(await Bun.file(outputPath).bytes()).toEqual(immutablePackageBytes);

    const consumer = join(runRoot, "offline-consumer");
    await mkdir(consumer);
    await writeJson(join(consumer, "package.json"), {
      name: "fixture-consumer",
      version: "1.0.0",
      private: true,
      dependencies: { "@rawr/research-sdk": `file:${outputPath}` },
    });
    await runHost(bunBinary, ["install", "--offline", "--ignore-scripts"], consumer);
    const installedRoot = await realpath(join(consumer, "node_modules", "@rawr", "research-sdk"));
    await runAdapter(
      Effect.flatMap(GitBun, (service) =>
        service.verifyInstalledSdkPackage({
          workspaceRoot: consumer,
          packageRoot: installedRoot,
          artifactPath: outputPath,
          expected: descriptor,
        })
      )
    );

    const consumerLockPath = join(consumer, "bun.lock");
    const consumerLockBytes = await readFile(consumerLockPath);
    const consumerLock = Bun.JSONC.parse(decoder.decode(consumerLockBytes));
    if (
      consumerLock === null ||
      typeof consumerLock !== "object" ||
      !("packages" in consumerLock) ||
      consumerLock.packages === null ||
      typeof consumerLock.packages !== "object" ||
      Array.isArray(consumerLock.packages)
    ) {
      throw new Error("The consumer fixture lock is malformed.");
    }
    const installedSdkRow = Reflect.get(consumerLock.packages, "@rawr/research-sdk");
    if (
      !Array.isArray(installedSdkRow) ||
      installedSdkRow.length !== 3 ||
      installedSdkRow[1] === null ||
      typeof installedSdkRow[1] !== "object" ||
      Array.isArray(installedSdkRow[1])
    ) {
      throw new Error("The installed SDK lock row is malformed.");
    }
    const lockedDependencies = Reflect.get(installedSdkRow[1], "dependencies");
    if (
      lockedDependencies === null ||
      typeof lockedDependencies !== "object" ||
      Array.isArray(lockedDependencies)
    ) {
      throw new Error("The installed SDK lock dependency map is malformed.");
    }
    Reflect.set(lockedDependencies, "effect", "0.0.0-lock-drift");
    await writeFile(consumerLockPath, `${JSON.stringify(consumerLock, null, 2)}\n`);
    const consumerEdgeMismatch = await runAdapterFailure(
      Effect.flatMap(GitBun, (service) =>
        service.verifyInstalledSdkPackage({
          workspaceRoot: consumer,
          packageRoot: installedRoot,
          artifactPath: outputPath,
          expected: descriptor,
        })
      )
    );
    expect(consumerEdgeMismatch).toEqual(
      expect.objectContaining({ kind: "GitBunIdentityMismatch" })
    );
    await writeFile(consumerLockPath, consumerLockBytes);

    await writeFile(
      outputPath,
      Buffer.concat([immutablePackageBytes, Buffer.from("artifact mutation")])
    );
    const artifactMismatch = await runAdapterFailure(
      Effect.flatMap(GitBun, (service) =>
        service.verifyInstalledSdkPackage({
          workspaceRoot: consumer,
          packageRoot: installedRoot,
          artifactPath: outputPath,
          expected: descriptor,
        })
      )
    );
    expect(artifactMismatch).toEqual(expect.objectContaining({ kind: "GitBunIdentityMismatch" }));
    await writeFile(outputPath, immutablePackageBytes);

    const installedManifestPath = join(installedRoot, descriptor.embeddedManifestPath);
    const installedManifestBytes = await readFile(installedManifestPath);
    await writeFile(
      installedManifestPath,
      Buffer.concat([installedManifestBytes, Buffer.from("\n")])
    );
    const manifestBytesMismatch = await runAdapterFailure(
      Effect.flatMap(GitBun, (service) =>
        service.verifyInstalledSdkPackage({
          workspaceRoot: consumer,
          packageRoot: installedRoot,
          artifactPath: outputPath,
          expected: descriptor,
        })
      )
    );
    expect(manifestBytesMismatch).toEqual(
      expect.objectContaining({ kind: "GitBunIdentityMismatch" })
    );
    await writeFile(installedManifestPath, installedManifestBytes);

    const wrongManifestDigest = {
      ...descriptor,
      embeddedManifestDigest: {
        ...descriptor.embeddedManifestDigest,
        value: "0".repeat(64),
      },
    } satisfies PackedPackageDescriptor;
    const manifestDigestMismatch = await runAdapterFailure(
      Effect.flatMap(GitBun, (service) =>
        service.verifyInstalledSdkPackage({
          workspaceRoot: consumer,
          packageRoot: installedRoot,
          artifactPath: outputPath,
          expected: wrongManifestDigest,
        })
      )
    );
    expect(manifestDigestMismatch).toEqual(
      expect.objectContaining({ kind: "GitBunIdentityMismatch" })
    );

    const installedEffectManifest = await realpath(
      Bun.resolveSync("effect/package.json", installedRoot)
    );
    const installedEffectEntry = await firstRegularJavaScriptFile(dirname(installedEffectManifest));
    const originalEffectEntry = await readFile(installedEffectEntry);
    await writeFile(
      installedEffectEntry,
      Buffer.concat([originalEffectEntry, Buffer.from("\n// reachable mutation\n")])
    );
    const contentMismatch = await runAdapterFailure(
      Effect.flatMap(GitBun, (service) =>
        service.verifyInstalledSdkPackage({
          workspaceRoot: consumer,
          packageRoot: installedRoot,
          artifactPath: outputPath,
          expected: descriptor,
        })
      )
    );
    expect(contentMismatch).toEqual(expect.objectContaining({ kind: "GitBunIdentityMismatch" }));
    await writeFile(installedEffectEntry, originalEffectEntry);

    const originalEffectMode = (await lstat(installedEffectEntry)).mode & 0o777;
    await chmod(installedEffectEntry, originalEffectMode ^ 0o020);
    await runAdapter(
      Effect.flatMap(GitBun, (service) =>
        service.verifyInstalledSdkPackage({
          workspaceRoot: consumer,
          packageRoot: installedRoot,
          artifactPath: outputPath,
          expected: descriptor,
        })
      )
    );
    await chmod(installedEffectEntry, originalEffectMode ^ 0o100);
    const modeMismatch = await runAdapterFailure(
      Effect.flatMap(GitBun, (service) =>
        service.verifyInstalledSdkPackage({
          workspaceRoot: consumer,
          packageRoot: installedRoot,
          artifactPath: outputPath,
          expected: descriptor,
        })
      )
    );
    expect(modeMismatch).toEqual(expect.objectContaining({ kind: "GitBunIdentityMismatch" }));
    await chmod(installedEffectEntry, originalEffectMode);

    const firstNode = descriptor.runtimeGraph.nodes[0];
    if (firstNode === undefined) {
      throw new Error("The installed runtime graph unexpectedly has no nodes.");
    }
    const mutatedGraph = {
      ...descriptor.runtimeGraph,
      nodes: descriptor.runtimeGraph.nodes.map((node, index) =>
        index === 0 ? { ...node, version: `${node.version}-mutated` } : node
      ),
    };
    const mutatedDescriptor = {
      ...descriptor,
      runtimeGraph: mutatedGraph,
    } satisfies PackedPackageDescriptor;
    const mismatch = await runAdapterFailure(
      Effect.flatMap(GitBun, (service) =>
        service.verifyInstalledSdkPackage({
          workspaceRoot: consumer,
          packageRoot: installedRoot,
          artifactPath: outputPath,
          expected: mutatedDescriptor,
        })
      )
    );
    expect(mismatch).toEqual(expect.objectContaining({ kind: "GitBunIdentityMismatch" }));
  }, 60_000);

  test("keeps a valid immutable package when the same pack effect is retried", async () => {
    const fixture = await createPackageFixture(join(runRoot, "pack-retry-package-fixture"), false);
    const outputPath = join(runRoot, "artifacts", "pack-retry-sdk.tgz");
    await mkdir(dirname(outputPath), { recursive: true });

    const result = await runAdapter(
      Effect.gen(function* () {
        const service = yield* GitBun;
        const pack = service.packSdkPackage({
          workspaceRoot: fixture.workspaceRoot,
          packageRoot: fixture.packageRoot,
          protocolVersion: "fixture-protocol-1",
          outputPath,
        });
        const descriptor = yield* pack;
        const publishedBytes = yield* Effect.promise(() => Bun.file(outputPath).bytes());
        const retry = yield* Effect.exit(pack);
        const retainedBytes = yield* Effect.promise(() => Bun.file(outputPath).bytes());
        return { descriptor, publishedBytes, retainedBytes, retry };
      })
    );

    expect(Exit.isFailure(result.retry)).toBe(true);
    expect(result.retainedBytes).toEqual(result.publishedBytes);
    expect(result.retainedBytes.byteLength).toBe(result.descriptor.byteLength);
  }, 60_000);

  test("does not resolve package builds through ambient dependency ancestors", async () => {
    const fixture = await createPackageFixture(
      join(runRoot, "ambient-build-package-fixture"),
      false
    );
    const manifestPath = join(fixture.packageRoot, "package.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.scripts.build = "bunx --bun tsc --version";
    delete manifest.devDependencies;
    await writeJson(manifestPath, manifest);
    await runHost(bunBinary, ["install", "--offline", "--ignore-scripts"], fixture.workspaceRoot);
    await rm(join(fixture.packageRoot, "node_modules", "typescript"), {
      recursive: true,
      force: true,
    });
    const outputPath = join(runRoot, "artifacts", "ambient-build-sdk.tgz");
    await mkdir(dirname(outputPath), { recursive: true });

    const missingBuildInput = await runAdapterFailure(
      Effect.flatMap(GitBun, (service) =>
        service.packSdkPackage({
          workspaceRoot: fixture.workspaceRoot,
          packageRoot: fixture.packageRoot,
          protocolVersion: "fixture-protocol-1",
          outputPath,
        })
      )
    );
    expect(missingBuildInput).toEqual(expect.objectContaining({ kind: "GitBunIdentityMismatch" }));
    await expect(pathExists(outputPath)).resolves.toBe(false);

    const unsafeRoot = await realpath(
      await mkdtemp(join(tmpdir(), "rawr-research-sdk-ambient-scratch-"))
    );
    const unsafeScratch = join(unsafeRoot, "scratch");
    await Promise.all([mkdir(join(unsafeRoot, "node_modules")), mkdir(unsafeScratch)]);
    const unsafeRuntime = makeResearchProcessRuntime(
      makeGitBunLayer(gitBunConfig(await realpath(unsafeScratch))).pipe(
        Layer.provide(BunCommandProcessLayer)
      )
    );
    try {
      const unsafeFailure = await unsafeRuntime.runPromiseExit(
        Effect.flatMap(GitBun, (service) =>
          service.packSdkPackage({
            workspaceRoot: fixture.workspaceRoot,
            packageRoot: fixture.packageRoot,
            protocolVersion: "fixture-protocol-1",
            outputPath,
          })
        )
      );
      expect(Exit.isFailure(unsafeFailure)).toBe(true);
      if (Exit.isSuccess(unsafeFailure)) {
        throw new Error("The ambient dependency ancestor unexpectedly passed admission.");
      }
      expect(Option.getOrThrow(Cause.findErrorOption(unsafeFailure.cause))).toEqual(
        expect.objectContaining({ kind: "GitBunInvalidInput" })
      );
    } finally {
      await unsafeRuntime.dispose();
      await rm(unsafeRoot, { recursive: true, force: true });
    }
  }, 60_000);

  test("rejects a package-local build tool that differs from its frozen lock edge", async () => {
    const fixture = await createPackageFixture(
      join(runRoot, "wrong-build-tool-package-fixture"),
      false
    );
    const workspaceManifestPath = join(fixture.workspaceRoot, "package.json");
    const workspaceManifest = JSON.parse(await readFile(workspaceManifestPath, "utf8"));
    workspaceManifest.devDependencies = { typescript: "5.9.3" };
    await writeJson(workspaceManifestPath, workspaceManifest);
    await runHost(bunBinary, ["install", "--offline", "--ignore-scripts"], fixture.workspaceRoot);

    const packageCompilerManifest = await realpath(
      join(fixture.packageRoot, "node_modules", "typescript", "package.json")
    );
    const workspaceCompilerManifest = await realpath(
      join(fixture.workspaceRoot, "node_modules", "typescript", "package.json")
    );
    expect(JSON.parse(await readFile(packageCompilerManifest, "utf8")).version).toBe("7.0.2");
    expect(JSON.parse(await readFile(workspaceCompilerManifest, "utf8")).version).toBe("5.9.3");

    const packageCompilerLink = join(fixture.packageRoot, "node_modules", "typescript");
    await unlink(packageCompilerLink);
    await symlink(
      relative(dirname(packageCompilerLink), dirname(workspaceCompilerManifest)),
      packageCompilerLink,
      "dir"
    );
    const outputPath = join(runRoot, "artifacts", "wrong-build-tool-sdk.tgz");
    await mkdir(dirname(outputPath), { recursive: true });

    const failure = await runAdapterFailure(
      Effect.flatMap(GitBun, (service) =>
        service.packSdkPackage({
          workspaceRoot: fixture.workspaceRoot,
          packageRoot: fixture.packageRoot,
          protocolVersion: "fixture-protocol-1",
          outputPath,
        })
      )
    );

    expect(failure).toEqual(expect.objectContaining({ kind: "GitBunIdentityMismatch" }));
    await expect(pathExists(outputPath)).resolves.toBe(false);
  }, 60_000);

  test("rejects a package-local executable link that bypasses its admitted build tool", async () => {
    const fixture = await createPackageFixture(
      join(runRoot, "wrong-build-executable-package-fixture"),
      false
    );
    const workspaceManifestPath = join(fixture.workspaceRoot, "package.json");
    const workspaceManifest = JSON.parse(await readFile(workspaceManifestPath, "utf8"));
    workspaceManifest.devDependencies = { typescript: "5.9.3" };
    await writeJson(workspaceManifestPath, workspaceManifest);
    await runHost(bunBinary, ["install", "--offline", "--ignore-scripts"], fixture.workspaceRoot);

    const packageCompilerManifest = await realpath(
      join(fixture.packageRoot, "node_modules", "typescript", "package.json")
    );
    const workspaceCompilerTarget = await realpath(
      join(fixture.workspaceRoot, "node_modules", "typescript", "bin", "tsc")
    );
    expect(JSON.parse(await readFile(packageCompilerManifest, "utf8")).version).toBe("7.0.2");

    const packageCompilerLink = join(fixture.packageRoot, "node_modules", ".bin", "tsc");
    await unlink(packageCompilerLink);
    await symlink(
      relative(dirname(packageCompilerLink), workspaceCompilerTarget),
      packageCompilerLink
    );
    const outputPath = join(runRoot, "artifacts", "wrong-build-executable-sdk.tgz");
    await mkdir(dirname(outputPath), { recursive: true });

    const failure = await runAdapterFailure(
      Effect.flatMap(GitBun, (service) =>
        service.packSdkPackage({
          workspaceRoot: fixture.workspaceRoot,
          packageRoot: fixture.packageRoot,
          protocolVersion: "fixture-protocol-1",
          outputPath,
        })
      )
    );

    expect(failure).toEqual(expect.objectContaining({ kind: "GitBunIdentityMismatch" }));
    await expect(pathExists(outputPath)).resolves.toBe(false);
  }, 60_000);

  test("rejects an undeclared package-local build input", async () => {
    const fixture = await createPackageFixture(
      join(runRoot, "undeclared-build-input-package-fixture"),
      false
    );
    const nodeModulesRoot = join(fixture.packageRoot, "node_modules");
    const declaredTarget = await realpath(join(nodeModulesRoot, "typescript"));
    await symlink(
      relative(nodeModulesRoot, declaredTarget),
      join(nodeModulesRoot, "undeclared-tool"),
      "dir"
    );
    const outputPath = join(runRoot, "artifacts", "undeclared-build-input-sdk.tgz");
    await mkdir(dirname(outputPath), { recursive: true });

    const failure = await runAdapterFailure(
      Effect.flatMap(GitBun, (service) =>
        service.packSdkPackage({
          workspaceRoot: fixture.workspaceRoot,
          packageRoot: fixture.packageRoot,
          protocolVersion: "fixture-protocol-1",
          outputPath,
        })
      )
    );

    expect(failure).toEqual(expect.objectContaining({ kind: "GitBunIdentityMismatch" }));
    await expect(pathExists(outputPath)).resolves.toBe(false);
  }, 60_000);

  test("rejects a build that mutates the physical build-input closure", async () => {
    const fixture = await createPackageFixture(
      join(runRoot, "build-input-content-package-fixture"),
      false
    );
    const compilerRoot = dirname(
      await realpath(join(fixture.packageRoot, "node_modules", "typescript", "package.json"))
    );
    const compilerEntry = join(compilerRoot, "lib", "tsc.js");
    const callerCompilerBytes = await readFile(compilerEntry);
    await writeFile(
      join(fixture.packageRoot, "build.ts"),
      [
        'import { mkdir, readFile, writeFile } from "node:fs/promises";',
        'await mkdir("dist", { recursive: true });',
        'const compiler = "node_modules/typescript/lib/tsc.js";',
        'await writeFile(compiler, Buffer.concat([await readFile(compiler), Buffer.from("\\n// staged mutation\\n")]));',
        'await Bun.write("dist/index.js", "export const fixture = true;\\n");',
        'await Bun.write("dist/index.d.ts", "export declare const fixture: true;\\n");',
      ].join("\n")
    );
    const outputPath = join(runRoot, "artifacts", "build-input-content-sdk.tgz");
    await mkdir(dirname(outputPath), { recursive: true });

    const failure = await runAdapterFailure(
      Effect.flatMap(GitBun, (service) =>
        service.packSdkPackage({
          workspaceRoot: fixture.workspaceRoot,
          packageRoot: fixture.packageRoot,
          protocolVersion: "fixture-protocol-1",
          outputPath,
        })
      )
    );

    expect(failure).toEqual(expect.objectContaining({ kind: "GitBunIdentityMismatch" }));
    expect(await readFile(compilerEntry)).toEqual(callerCompilerBytes);
    await expect(pathExists(outputPath)).resolves.toBe(false);
  }, 60_000);

  test("binds the complete copied Bun materialization surface", async () => {
    const fixture = await createPackageFixture(
      join(runRoot, "materialization-surface-package-fixture"),
      false
    );
    const compilerRoot = dirname(
      await realpath(join(fixture.packageRoot, "node_modules", "typescript", "package.json"))
    );
    const containerInput = join(dirname(compilerRoot), "adapter-surface.txt");
    await writeFile(containerInput, "baseline\n");
    const before = await Effect.runPromise(deriveRuntimeGraph(fixture));
    await writeFile(containerInput, "changed\n");
    const after = await Effect.runPromise(deriveRuntimeGraph(fixture));
    expect(after.buildInputDigest).not.toEqual(before.buildInputDigest);

    await writeFile(
      join(fixture.packageRoot, "build.ts"),
      [
        'import { dirname, join } from "node:path";',
        'import { mkdir, realpath, writeFile } from "node:fs/promises";',
        'await mkdir("dist", { recursive: true });',
        'const compiler = await realpath("node_modules/typescript");',
        'await writeFile(join(dirname(compiler), "adapter-surface.txt"), "staged mutation\\n");',
        'await Bun.write("dist/index.js", "export const fixture = true;\\n");',
        'await Bun.write("dist/index.d.ts", "export declare const fixture: true;\\n");',
      ].join("\n")
    );
    const outputPath = join(runRoot, "artifacts", "materialization-surface-sdk.tgz");
    await mkdir(dirname(outputPath), { recursive: true });

    const failure = await runAdapterFailure(
      Effect.flatMap(GitBun, (service) =>
        service.packSdkPackage({
          workspaceRoot: fixture.workspaceRoot,
          packageRoot: fixture.packageRoot,
          protocolVersion: "fixture-protocol-1",
          outputPath,
        })
      )
    );

    expect(failure).toEqual(expect.objectContaining({ kind: "GitBunIdentityMismatch" }));
    expect(await readFile(containerInput, "utf8")).toBe("changed\n");
    await expect(pathExists(outputPath)).resolves.toBe(false);
  }, 60_000);

  test("rejects a rewired transitive package-local build input", async () => {
    const fixture = await createPackageFixture(
      join(runRoot, "transitive-build-input-package-fixture"),
      false
    );
    const workspaceManifestPath = join(fixture.workspaceRoot, "package.json");
    const workspaceManifest = JSON.parse(await readFile(workspaceManifestPath, "utf8"));
    workspaceManifest.devDependencies = { "bun-types": "1.3.9" };
    await writeJson(workspaceManifestPath, workspaceManifest);
    await runHost(bunBinary, ["install", "--offline", "--ignore-scripts"], fixture.workspaceRoot);

    const typesManifest = await realpath(
      join(fixture.packageRoot, "node_modules", "@types", "bun", "package.json")
    );
    const typesContainerNodeModules = dirname(dirname(dirname(typesManifest)));
    const transitiveLink = join(typesContainerNodeModules, "bun-types");
    const wrongTarget = dirname(
      await realpath(join(fixture.workspaceRoot, "node_modules", "bun-types", "package.json"))
    );
    await unlink(transitiveLink);
    await symlink(relative(typesContainerNodeModules, wrongTarget), transitiveLink, "dir");
    const outputPath = join(runRoot, "artifacts", "transitive-build-input-sdk.tgz");
    await mkdir(dirname(outputPath), { recursive: true });

    const failure = await runAdapterFailure(
      Effect.flatMap(GitBun, (service) =>
        service.packSdkPackage({
          workspaceRoot: fixture.workspaceRoot,
          packageRoot: fixture.packageRoot,
          protocolVersion: "fixture-protocol-1",
          outputPath,
        })
      )
    );

    expect(failure).toEqual(expect.objectContaining({ kind: "GitBunIdentityMismatch" }));
    await expect(pathExists(outputPath)).resolves.toBe(false);
  }, 60_000);

  test("limits lock admission to the exact SDK-rooted identities", async () => {
    const fixture = await createPackageFixture(join(runRoot, "rooted-lock-package-fixture"), false);
    const shadowRoot = join(fixture.workspaceRoot, "packages", "effect-shadow");
    await mkdir(shadowRoot);
    await writeJson(join(shadowRoot, "package.json"), {
      name: "effect",
      version: "3.0.0",
      type: "module",
    });
    await runHost(bunBinary, ["install", "--offline", "--ignore-scripts"], fixture.workspaceRoot);
    const resolvedEffect = JSON.parse(
      await readFile(
        await realpath(join(fixture.packageRoot, "node_modules", "effect", "package.json")),
        "utf8"
      )
    );
    expect(resolvedEffect.version).toBe("4.0.0-beta.99");

    const descriptor = await packFixture(
      fixture,
      join(runRoot, "artifacts", "rooted-lock-sdk.tgz")
    );

    expect(descriptor.packageName).toBe("@rawr/research-sdk");
    const lockPath = join(fixture.workspaceRoot, "bun.lock");
    const lock = Bun.JSONC.parse(await readFile(lockPath, "utf8"));
    if (
      lock === null ||
      typeof lock !== "object" ||
      !("packages" in lock) ||
      lock.packages === null ||
      typeof lock.packages !== "object" ||
      Array.isArray(lock.packages)
    ) {
      throw new Error("The rooted-lock fixture lock is malformed.");
    }
    Reflect.set(lock.packages, "unreachable/effect", [
      "effect@3",
      "",
      { dependencies: [] },
      "sha512-AA==",
    ]);
    await writeJson(lockPath, lock);
    const rooted = await Effect.runPromise(
      deriveRuntimeGraph({
        workspaceRoot: fixture.workspaceRoot,
        packageRoot: fixture.packageRoot,
      })
    );
    expect(rooted.graph.nodes.find(({ nodeId }) => nodeId === rooted.graph.rootNodeId)?.name).toBe(
      "@rawr/research-sdk"
    );
  }, 60_000);

  test("rejects dependency links that target the owner of the Bun install store", async () => {
    const fixture = await createPackageFixture(
      join(runRoot, "install-store-parent-package-fixture"),
      false
    );
    const packageNodeModules = join(fixture.packageRoot, "node_modules");
    const ownerNodeModules = join(fixture.workspaceRoot, "node_modules");
    await symlink(
      relative(packageNodeModules, ownerNodeModules),
      join(packageNodeModules, "store-parent-escape"),
      "dir"
    );
    const outputPath = join(runRoot, "artifacts", "install-store-parent-sdk.tgz");
    await mkdir(dirname(outputPath), { recursive: true });

    const failure = await runAdapterFailure(
      Effect.flatMap(GitBun, (service) =>
        service.packSdkPackage({
          workspaceRoot: fixture.workspaceRoot,
          packageRoot: fixture.packageRoot,
          protocolVersion: "fixture-protocol-1",
          outputPath,
        })
      )
    );

    expect(failure).toEqual(expect.objectContaining({ kind: "GitBunIdentityMismatch" }));
    await expect(pathExists(outputPath)).resolves.toBe(false);
  }, 60_000);

  test("rechecks physical dependency targets after the staged build", async () => {
    const fixture = await createPackageFixture(
      join(runRoot, "build-rewire-package-fixture"),
      false
    );
    await writeFile(
      join(fixture.packageRoot, "build.ts"),
      [
        'import { mkdir, readlink, rm, symlink } from "node:fs/promises";',
        'await mkdir("dist", { recursive: true });',
        'const replacement = await readlink("node_modules/typebox");',
        'await rm("node_modules/effect", { force: true });',
        'await symlink(replacement, "node_modules/effect", "dir");',
        'await Bun.write("dist/index.js", "export const fixture = true;\\n");',
        'await Bun.write("dist/index.d.ts", "export declare const fixture: true;\\n");',
      ].join("\n")
    );
    const callerEffectManifest = await realpath(
      join(fixture.packageRoot, "node_modules", "effect", "package.json")
    );
    const outputPath = join(runRoot, "artifacts", "build-rewire-sdk.tgz");
    await mkdir(dirname(outputPath), { recursive: true });

    const failure = await runAdapterFailure(
      Effect.flatMap(GitBun, (service) =>
        service.packSdkPackage({
          workspaceRoot: fixture.workspaceRoot,
          packageRoot: fixture.packageRoot,
          protocolVersion: "fixture-protocol-1",
          outputPath,
        })
      )
    );

    expect(failure).toEqual(expect.objectContaining({ kind: "GitBunIdentityMismatch" }));
    expect(JSON.parse(await readFile(callerEffectManifest, "utf8")).version).toBe("4.0.0-beta.99");
    await expect(pathExists(outputPath)).resolves.toBe(false);
  }, 60_000);

  test("rejects workspace package bytes despite a colliding registry attestation", async () => {
    const fixture = await createPackageFixture(
      join(runRoot, "workspace-collision-package-fixture"),
      false
    );
    const workspaceDependency = join(fixture.workspaceRoot, "packages", "effect-shadow");
    await mkdir(workspaceDependency);
    await writeJson(join(workspaceDependency, "package.json"), {
      name: "effect",
      version: "4.0.0-beta.99",
      type: "module",
      exports: { ".": "./index.js" },
    });
    await writeFile(join(workspaceDependency, "index.js"), "export const shadow = true;\n");

    const sdkManifestPath = join(fixture.packageRoot, "package.json");
    const sdkManifest = JSON.parse(await readFile(sdkManifestPath, "utf8"));
    sdkManifest.dependencies.effect = "workspace:*";
    await writeJson(sdkManifestPath, sdkManifest);
    await runHost(bunBinary, ["install", "--offline", "--ignore-scripts"], fixture.workspaceRoot);

    const resolvedEffectManifest = await realpath(
      Bun.resolveSync("effect/package.json", fixture.packageRoot)
    );
    expect(resolvedEffectManifest).toBe(join(workspaceDependency, "package.json"));

    const lockPath = join(fixture.workspaceRoot, "bun.lock");
    const lock = Bun.JSONC.parse(await readFile(lockPath, "utf8"));
    if (
      lock === null ||
      typeof lock !== "object" ||
      !("packages" in lock) ||
      lock.packages === null ||
      typeof lock.packages !== "object" ||
      Array.isArray(lock.packages)
    ) {
      throw new Error("The workspace-collision fixture lock is malformed.");
    }
    Reflect.set(lock.packages, "collision/effect", [
      "effect@4.0.0-beta.99",
      "",
      {},
      `sha512-${Buffer.alloc(64).toString("base64")}`,
    ]);
    await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`);

    const outputPath = join(runRoot, "artifacts", "workspace-collision-sdk.tgz");
    await mkdir(dirname(outputPath), { recursive: true });
    const failure = await runAdapterFailure(
      Effect.flatMap(GitBun, (service) =>
        service.packSdkPackage({
          workspaceRoot: fixture.workspaceRoot,
          packageRoot: fixture.packageRoot,
          protocolVersion: "fixture-protocol-1",
          outputPath,
        })
      )
    );
    expect(failure).toEqual(expect.objectContaining({ kind: "GitBunInvalidInput" }));
    await expect(pathExists(outputPath)).resolves.toBe(false);
  }, 60_000);

  test("rejects producer manifest dependency edges that differ from the frozen lock", async () => {
    const fixture = await createPackageFixture(
      join(runRoot, "producer-edge-drift-package-fixture"),
      false
    );
    const manifestPath = join(fixture.packageRoot, "package.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.dependencies.effect = "0.0.0-manifest-drift";
    await writeJson(manifestPath, manifest);
    const outputPath = join(runRoot, "artifacts", "producer-edge-drift-sdk.tgz");
    await mkdir(dirname(outputPath), { recursive: true });

    const failure = await runAdapterFailure(
      Effect.flatMap(GitBun, (service) =>
        service.packSdkPackage({
          workspaceRoot: fixture.workspaceRoot,
          packageRoot: fixture.packageRoot,
          protocolVersion: "fixture-protocol-1",
          outputPath,
        })
      )
    );

    expect(failure).toEqual(expect.objectContaining({ kind: "GitBunIdentityMismatch" }));
    await expect(pathExists(outputPath)).resolves.toBe(false);
  }, 60_000);

  test("rejects an installed target that differs from its contextual lock row", async () => {
    const fixture = await createPackageFixture(
      join(runRoot, "contextual-resolution-package-fixture"),
      false
    );
    const workspaceManifestPath = join(fixture.workspaceRoot, "package.json");
    const workspaceManifest = JSON.parse(await readFile(workspaceManifestPath, "utf8"));
    workspaceManifest.dependencies = { effect: "3.21.3" };
    await writeJson(workspaceManifestPath, workspaceManifest);
    await runHost(bunBinary, ["install", "--offline", "--ignore-scripts"], fixture.workspaceRoot);

    const packageEffectManifest = await realpath(
      join(fixture.packageRoot, "node_modules", "effect", "package.json")
    );
    const workspaceEffectManifest = await realpath(
      join(fixture.workspaceRoot, "node_modules", "effect", "package.json")
    );
    expect(JSON.parse(await readFile(packageEffectManifest, "utf8")).version).toBe("4.0.0-beta.99");
    expect(JSON.parse(await readFile(workspaceEffectManifest, "utf8")).version).toBe("3.21.3");

    const sharedRange = ">=3.0.0 || 4.0.0-beta.99";
    const packageManifestPath = join(fixture.packageRoot, "package.json");
    const packageManifest = JSON.parse(await readFile(packageManifestPath, "utf8"));
    packageManifest.dependencies.effect = sharedRange;
    await writeJson(packageManifestPath, packageManifest);
    const lockPath = join(fixture.workspaceRoot, "bun.lock");
    const lock = Bun.JSONC.parse(await readFile(lockPath, "utf8"));
    if (
      lock === null ||
      typeof lock !== "object" ||
      !("workspaces" in lock) ||
      lock.workspaces === null ||
      typeof lock.workspaces !== "object" ||
      Array.isArray(lock.workspaces)
    ) {
      throw new Error("The contextual-resolution fixture lock is malformed.");
    }
    const packageWorkspace = Reflect.get(lock.workspaces, "packages/research-sdk");
    if (
      packageWorkspace === null ||
      typeof packageWorkspace !== "object" ||
      !("dependencies" in packageWorkspace) ||
      packageWorkspace.dependencies === null ||
      typeof packageWorkspace.dependencies !== "object" ||
      Array.isArray(packageWorkspace.dependencies)
    ) {
      throw new Error("The contextual-resolution fixture package row is malformed.");
    }
    Reflect.set(packageWorkspace.dependencies, "effect", sharedRange);
    await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`);

    const packageEffectLink = join(fixture.packageRoot, "node_modules", "effect");
    await unlink(packageEffectLink);
    await symlink(
      relative(dirname(packageEffectLink), dirname(workspaceEffectManifest)),
      packageEffectLink,
      "dir"
    );

    const outputPath = join(runRoot, "artifacts", "contextual-resolution-sdk.tgz");
    await mkdir(dirname(outputPath), { recursive: true });
    const failure = await runAdapterFailure(
      Effect.flatMap(GitBun, (service) =>
        service.packSdkPackage({
          workspaceRoot: fixture.workspaceRoot,
          packageRoot: fixture.packageRoot,
          protocolVersion: "fixture-protocol-1",
          outputPath,
        })
      )
    );

    expect(failure).toEqual(expect.objectContaining({ kind: "GitBunInvalidInput" }));
    await expect(pathExists(outputPath)).resolves.toBe(false);
  }, 60_000);

  test("rejects contextual lock drift that violates the frozen dependency request", async () => {
    const fixture = await createPackageFixture(
      join(runRoot, "contextual-request-package-fixture"),
      false
    );
    const workspaceManifestPath = join(fixture.workspaceRoot, "package.json");
    const workspaceManifest = JSON.parse(await readFile(workspaceManifestPath, "utf8"));
    workspaceManifest.dependencies = { typebox: "1.0.81" };
    await writeJson(workspaceManifestPath, workspaceManifest);
    await runHost(bunBinary, ["install", "--offline", "--ignore-scripts"], fixture.workspaceRoot);

    const packageTypeBoxManifest = await realpath(
      join(fixture.packageRoot, "node_modules", "typebox", "package.json")
    );
    const workspaceTypeBoxManifest = await realpath(
      join(fixture.workspaceRoot, "node_modules", "typebox", "package.json")
    );
    expect(JSON.parse(await readFile(packageTypeBoxManifest, "utf8")).version).toBe("1.3.6");
    expect(JSON.parse(await readFile(workspaceTypeBoxManifest, "utf8")).version).toBe("1.0.81");

    const packageTypeBoxLink = join(fixture.packageRoot, "node_modules", "typebox");
    await unlink(packageTypeBoxLink);
    await symlink(
      relative(dirname(packageTypeBoxLink), dirname(workspaceTypeBoxManifest)),
      packageTypeBoxLink,
      "dir"
    );

    const lockPath = join(fixture.workspaceRoot, "bun.lock");
    const lock = Bun.JSONC.parse(await readFile(lockPath, "utf8"));
    if (
      lock === null ||
      typeof lock !== "object" ||
      !("packages" in lock) ||
      lock.packages === null ||
      typeof lock.packages !== "object" ||
      Array.isArray(lock.packages)
    ) {
      throw new Error("The contextual-request fixture lock is malformed.");
    }
    const rootTypeBoxRow = Reflect.get(lock.packages, "typebox");
    if (rootTypeBoxRow === undefined) {
      throw new Error("The contextual-request fixture omits its root TypeBox row.");
    }
    Reflect.set(lock.packages, "@rawr/research-sdk/typebox", rootTypeBoxRow);
    await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`);

    const outputPath = join(runRoot, "artifacts", "contextual-request-sdk.tgz");
    await mkdir(dirname(outputPath), { recursive: true });
    const failure = await runAdapterFailure(
      Effect.flatMap(GitBun, (service) =>
        service.packSdkPackage({
          workspaceRoot: fixture.workspaceRoot,
          packageRoot: fixture.packageRoot,
          protocolVersion: "fixture-protocol-1",
          outputPath,
        })
      )
    );

    expect(failure).toEqual(expect.objectContaining({ kind: "GitBunIdentityMismatch" }));
    await expect(pathExists(outputPath)).resolves.toBe(false);
  }, 60_000);

  test("packs concurrent immutable artifacts without sharing caller-owned build state", async () => {
    const fixture = await createPackageFixture(join(runRoot, "concurrent-package-fixture"), false);
    const callerIdentityBefore = await callerPackageIdentity(fixture);
    const [left, right] = await Promise.all([
      packFixture(fixture, join(runRoot, "artifacts", "concurrent-left.tgz")),
      packFixture(fixture, join(runRoot, "artifacts", "concurrent-right.tgz")),
    ]);

    expect(left.packageName).toBe("@rawr/research-sdk");
    expect(right.packageName).toBe("@rawr/research-sdk");
    expect(left.runtimeGraph).toEqual(right.runtimeGraph);
    expect(await callerPackageIdentity(fixture)).toEqual(callerIdentityBefore);
  }, 60_000);

  test("rejects a build that mutates its owner lock before packing", async () => {
    const fixture = await createPackageFixture(join(runRoot, "drifting-package-fixture"), true);
    const callerIdentityBefore = await callerPackageIdentity(fixture);
    const outputPath = join(runRoot, "artifacts", "drifting-fixture.tgz");
    await mkdir(dirname(outputPath), { recursive: true });
    const failure = await runAdapterFailure(
      Effect.flatMap(GitBun, (service) =>
        service.packSdkPackage({
          workspaceRoot: fixture.workspaceRoot,
          packageRoot: fixture.packageRoot,
          protocolVersion: "fixture-protocol-1",
          outputPath,
        })
      )
    );
    expect(failure).toEqual(expect.objectContaining({ kind: "GitBunIdentityMismatch" }));
    expect(await callerPackageIdentity(fixture)).toEqual(callerIdentityBefore);
  }, 60_000);

  test("ignores caller dist contents without traversing a hostile dist root", async () => {
    const fixture = await createPackageFixture(
      join(runRoot, "manifest-symlink-package-fixture"),
      false
    );
    const target = join(runRoot, "manifest-symlink-target.txt");
    const manifest = join(fixture.packageRoot, "dist", "research-sdk-runtime-graph.json");
    const outputPath = join(runRoot, "artifacts", "manifest-symlink-fixture.tgz");
    await mkdir(dirname(outputPath), { recursive: true });
    await mkdir(dirname(manifest), { recursive: true });
    await writeFile(target, "owner-controlled sentinel\n");
    await symlink(target, manifest);

    await packFixture(fixture, outputPath);
    await expect(readFile(target, "utf8")).resolves.toBe("owner-controlled sentinel\n");
    await expect(readlink(manifest)).resolves.toBe(target);
    await expect(pathExists(outputPath)).resolves.toBe(true);
    await expect(pathExists(join(fixture.packageRoot, "prepack-ran.txt"))).resolves.toBe(false);

    const distFixture = await createPackageFixture(
      join(runRoot, "dist-symlink-package-fixture"),
      false
    );
    const externalDistribution = join(runRoot, "hostile-dist-target");
    const distOutputPath = join(runRoot, "artifacts", "dist-symlink-fixture.tgz");
    await mkdir(externalDistribution);
    await symlink(externalDistribution, join(distFixture.packageRoot, "dist"));

    const distFailure = await runAdapterFailure(
      Effect.flatMap(GitBun, (service) =>
        service.packSdkPackage({
          workspaceRoot: distFixture.workspaceRoot,
          packageRoot: distFixture.packageRoot,
          protocolVersion: "fixture-protocol-1",
          outputPath: distOutputPath,
        })
      )
    );
    expect(distFailure).toEqual(expect.objectContaining({ kind: "GitBunInvalidInput" }));
    expect(await readdir(externalDistribution)).toEqual([]);
    await expect(pathExists(distOutputPath)).resolves.toBe(false);
  }, 60_000);
});

function gitBunConfig(configuredScratchRoot: string) {
  return {
    git: {
      executable: gitBinary,
      expectedVersion: expectedGitVersion,
    },
    bun: {
      executable: bunBinary,
      expectedVersion: expectedBunVersion,
      expectedRevision: expectedBunRevision,
    },
    scratchRoot: configuredScratchRoot,
    command: {
      timeoutMs: 20_000,
      terminationGraceMs: 1_000,
    },
  };
}

async function runAdapter<Output>(
  effect: Effect.Effect<Output, GitBunError, GitBun>
): Promise<Output> {
  const exit = await runtime.runPromiseExit(effect);
  if (Exit.isFailure(exit)) {
    throw new Error(Cause.pretty(exit.cause));
  }
  return exit.value;
}

async function runAdapterFailure<Output>(
  effect: Effect.Effect<Output, GitBunError, GitBun>
): Promise<GitBunError> {
  const exit = await runtime.runPromiseExit(effect);
  if (Exit.isSuccess(exit)) {
    throw new Error("The fail-closed operation unexpectedly succeeded.");
  }
  return Option.getOrThrow(Cause.findErrorOption(exit.cause)) as GitBunError;
}

async function materialize(destinationPath: string): Promise<void> {
  await runAdapter(
    Effect.flatMap(GitBun, (service) =>
      service.materializeRevision({
        sourceRepositoryPath: gitFixture.root,
        revision: gitFixture.revision,
        destinationPath,
      })
    )
  );
}

async function changedProduct(): Promise<ChangedProduct> {
  changedProductPromise ??= createChangedProduct();
  return changedProductPromise;
}

async function createChangedProduct(): Promise<ChangedProduct> {
  const root = join(runRoot, "terminal-product");
  await materialize(root);
  await writeFile(join(root, "src", "text.txt"), "product text\n");
  await writeFile(join(root, "src", "crlf.crlf"), "line one\r\nline two product\r\n");
  await writeFile(join(root, "src", "binary.bin"), Buffer.from([0, 255, 16, 32, 64, 128, 7]));
  await unlink(join(root, "src", "delete.txt"));
  await rename(join(root, "src", "rename-source.txt"), join(root, "src", "renamed.txt"));
  await writeFile(join(root, "src", "added.txt"), "new product file\n");
  await writeFile(
    join(root, "src", "ignored-by-source-policy.txt"),
    "submitted despite source ignore policy\n"
  );
  await chmod(join(root, "src", "executable.sh"), 0o644);
  await writeFile(join(root, "src", "spaced name.txt"), "space product\n");
  await writeFile(join(root, "src", "café.txt"), "unicode product\n");
  await writeFile(join(root, "ignored", "run.log"), "ignored product\n");
  await writeFile(join(root, "ignored", "new.log"), "ignored transient\n");

  const capture = await runAdapter(
    Effect.flatMap(GitBun, (service) =>
      service.capturePatch({
        sourceRepositoryPath: gitFixture.root,
        baseline: gitFixture.revision,
        terminalProductPath: root,
        pathMapping,
      })
    )
  );
  return { root, capture };
}

async function rejectApply(
  name: string,
  descriptor: PatchDescriptor,
  patchBytes: Uint8Array,
  mapping: ArtifactPathMapping,
  baseline: ExactGitRevision
): Promise<GitBunError> {
  return runAdapterFailure(
    Effect.flatMap(GitBun, (service) =>
      service.applyAndRegenerate({
        sourceRepositoryPath: gitFixture.root,
        baseline,
        descriptor,
        patchBytes,
        pathMapping: mapping,
        productPath: join(runRoot, `rejected-${name}`),
      })
    )
  );
}

async function createGitFixture(root: string): Promise<GitFixture> {
  await mkdir(join(root, "src"), { recursive: true });
  await mkdir(join(root, "ignored"));
  await mkdir(join(root, "protected"));
  const crlf = encoder.encode("line one\r\nline two\r\n");
  const binary = Uint8Array.from([0, 255, 1, 2, 3, 128, 254]);
  await Promise.all([
    writeFile(join(root, "src", "text.txt"), "baseline text\n"),
    writeFile(join(root, "src", "crlf.crlf"), crlf),
    writeFile(join(root, "src", "binary.bin"), binary),
    writeFile(join(root, "src", "delete.txt"), "delete baseline\n"),
    writeFile(join(root, "src", "rename-source.txt"), "rename baseline\n"),
    writeFile(join(root, "src", "executable.sh"), "#!/bin/sh\nprintf 'fixture\\n'\n"),
    writeFile(join(root, "src", "spaced name.txt"), "space baseline\n"),
    writeFile(join(root, "src", "café.txt"), "unicode baseline\n"),
    writeFile(join(root, "ignored", "run.log"), "ignored baseline\n"),
    writeFile(join(root, "protected", "authority.txt"), "protected baseline\n"),
  ]);
  await chmod(join(root, "src", "executable.sh"), 0o755);
  await symlink("text.txt", join(root, "src", "safe-link"));

  await runGit(["init", "--object-format=sha1", root], dirname(root));
  await runGit(["-C", root, "config", "user.name", "Fixture Author"], root);
  await runGit(["-C", root, "config", "user.email", "fixture@example.invalid"], root);
  await runGit(["-C", root, "add", "-A"], root);
  await runGit(["-C", root, "commit", "-m", "baseline bytes"], root);

  await writeFile(
    join(root, ".gitattributes"),
    "*.txt filter=poison\n*.crlf text eol=lf\n*.bin diff=poison\n"
  );
  await writeFile(join(root, ".gitignore"), "ignored/*\nsrc/ignored-by-source-policy.txt\n");
  await runGit(["-C", root, "add", ".gitattributes", ".gitignore"], root);
  await runGit(["-C", root, "commit", "-m", "hostile repository policy"], root);
  await runGit(["-C", root, "config", "filter.poison.clean", "/bin/echo poisoned"], root);
  await runGit(["-C", root, "config", "diff.poison.command", "/usr/bin/false"], root);
  await runGit(["-C", root, "config", "core.autocrlf", "true"], root);

  const commitObjectId = (await runGit(["-C", root, "rev-parse", "HEAD"], root)).trim();
  const rootTreeObjectId = (await runGit(["-C", root, "rev-parse", "HEAD^{tree}"], root)).trim();
  const objectFormat = (
    await runGit(["-C", root, "rev-parse", "--show-object-format"], root)
  ).trim();
  if (objectFormat !== "sha1") {
    throw new Error(`Unexpected Git fixture object format: ${objectFormat}`);
  }
  return {
    root: await realpath(root),
    revision: {
      repositoryIdentity: gitRepositoryIdentity({
        commitObjectId,
        objectFormat,
        rootTreeObjectId,
      }),
      commitObjectId,
      rootTreeObjectId,
      selectedTreeObjectId: rootTreeObjectId,
      objectFormat,
    },
    baseline: { binary, crlf },
  };
}

async function runGit(arguments_: readonly string[], cwd: string): Promise<string> {
  const result = await runHost(gitBinary, arguments_, cwd, {
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_TERMINAL_PROMPT: "0",
    LANG: "C",
    LC_ALL: "C",
    TZ: "UTC",
  });
  return decoder.decode(result.stdout);
}

async function createPackageFixture(
  root: string,
  mutateLockDuringBuild: boolean
): Promise<{
  readonly workspaceRoot: string;
  readonly packageRoot: string;
}> {
  const packageRoot = join(root, "packages", "research-sdk");
  await mkdir(packageRoot, { recursive: true });
  await writeJson(join(root, "package.json"), {
    name: "fixture-workspace",
    version: "1.0.0",
    private: true,
    workspaces: ["packages/*"],
  });
  await writeJson(join(packageRoot, "package.json"), {
    name: "@rawr/research-sdk",
    version: "1.0.0",
    type: "module",
    files: ["dist", "package.json"],
    scripts: {
      build: "bun build.ts",
      prepack: "bun -e \"await Bun.write('prepack-ran.txt', 'ran')\"",
    },
    dependencies: { effect: "4.0.0-beta.99", typebox: "1.3.6" },
    devDependencies: {
      "@types/bun": "1.3.14",
      "@types/node": "22.20.1",
      typescript: "7.0.2",
    },
  });
  await writeFile(
    join(packageRoot, "build.ts"),
    [
      'import { mkdir } from "node:fs/promises";',
      'await mkdir("dist", { recursive: true });',
      'await Bun.write("dist/index.js", "export const fixture = true;\\n");',
      'await Bun.write("dist/index.d.ts", "export declare const fixture: true;\\n");',
      ...(mutateLockDuringBuild
        ? [
            'await Bun.write("../../bun.lock", `${await Bun.file("../../bun.lock").text()}\\n// build mutation\\n`);',
          ]
        : []),
    ].join("\n")
  );
  await runHost(bunBinary, ["install", "--offline", "--ignore-scripts"], root);
  return {
    workspaceRoot: await realpath(root),
    packageRoot: await realpath(packageRoot),
  };
}

async function packFixture(
  fixture: {
    readonly workspaceRoot: string;
    readonly packageRoot: string;
  },
  outputPath: string
): Promise<PackedPackageDescriptor> {
  await mkdir(dirname(outputPath), { recursive: true });
  return runAdapter(
    Effect.flatMap(GitBun, (service) =>
      service.packSdkPackage({
        workspaceRoot: fixture.workspaceRoot,
        packageRoot: fixture.packageRoot,
        protocolVersion: "fixture-protocol-1",
        outputPath,
      })
    )
  );
}

async function runHost(
  executable: string,
  arguments_: readonly string[],
  cwd: string,
  environment: Readonly<Record<string, string>> = {}
): Promise<{ readonly stdout: Uint8Array; readonly stderr: Uint8Array }> {
  const child = Bun.spawn({
    cmd: [executable, ...arguments_],
    cwd,
    env: {
      HOME: process.env.HOME ?? "/nonexistent",
      PATH: `${dirname(bunBinary)}:${dirname(gitBinary)}:/usr/bin:/bin`,
      LANG: "C",
      LC_ALL: "C",
      TZ: "UTC",
      ...environment,
    },
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).arrayBuffer(),
    new Response(child.stderr).arrayBuffer(),
  ]);
  const result = {
    stdout: new Uint8Array(stdout),
    stderr: new Uint8Array(stderr),
  };
  if (exitCode !== 0) {
    throw new Error(
      `${executable} ${arguments_.join(" ")} exited ${exitCode}: ${decoder.decode(result.stderr)}`
    );
  }
  return result;
}

function exited(stdout: string, exitCode = 0, stderr = "") {
  return {
    kind: "Exited" as const,
    exitCode,
    signalCode: null,
    stdout: encoder.encode(stdout),
    stderr: encoder.encode(stderr),
  };
}

function toolIdentityResult(request: CommandRequest): CommandResult | undefined {
  const isVersion = request.arguments.length === 1 && request.arguments[0] === "--version";
  const isRevision = request.arguments.some((argument) =>
    argument.includes("process.stdout.write(Bun.revision)")
  );
  if (request.executable === gitBinary && isVersion) {
    return exited(`git version ${expectedGitVersion}\n`);
  }
  if (request.executable === bunBinary && isVersion) {
    return exited(`${expectedBunVersion}\n`);
  }
  return request.executable === bunBinary && isRevision ? exited(expectedBunRevision) : undefined;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (Reflect.get(error as object, "code") === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function waitForPath(path: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!(await pathExists(path))) {
    if (Date.now() >= deadline) {
      throw new Error(`Timed out waiting for ${path}.`);
    }
    await Bun.sleep(1);
  }
}

async function firstRegularJavaScriptFile(root: string): Promise<string> {
  const entries = (await readdir(root, { withFileTypes: true })).sort((left, right) =>
    left.name.localeCompare(right.name)
  );
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isFile() && entry.name.endsWith(".js")) {
      return path;
    }
    if (entry.isDirectory() && entry.name !== "node_modules") {
      try {
        return await firstRegularJavaScriptFile(path);
      } catch (error) {
        if (!(error instanceof Error) || error.message !== "No JavaScript file found.") {
          throw error;
        }
      }
    }
  }
  throw new Error("No JavaScript file found.");
}

interface RepositoryGuard {
  readonly status: string;
  readonly rootSymlinks: readonly { readonly path: string; readonly target: string }[];
}

interface CallerPackageIdentity {
  readonly workspaceManifestDigest: string;
  readonly ownerLockDigest: string;
  readonly packageEntries: readonly {
    readonly path: string;
    readonly kind: "Directory" | "File" | "SymbolicLink";
    readonly mode: number;
    readonly identity: string;
  }[];
}

async function callerPackageIdentity(fixture: {
  readonly workspaceRoot: string;
  readonly packageRoot: string;
}): Promise<CallerPackageIdentity> {
  const packageEntries: CallerPackageIdentity["packageEntries"][number][] = [];
  const walk = async (directory: string): Promise<void> => {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((left, right) =>
      left.name.localeCompare(right.name)
    )) {
      if (entry.name === "node_modules") {
        continue;
      }
      const path = join(directory, entry.name);
      const relativePath = relative(fixture.packageRoot, path);
      const stat = await lstat(path);
      if (entry.isDirectory()) {
        packageEntries.push({
          path: relativePath,
          kind: "Directory",
          mode: stat.mode & 0o777,
          identity: "",
        });
        await walk(path);
      } else if (entry.isFile()) {
        packageEntries.push({
          path: relativePath,
          kind: "File",
          mode: stat.mode & 0o777,
          identity: new Bun.CryptoHasher("sha256")
            .update(await Bun.file(path).bytes())
            .digest("hex"),
        });
      } else if (entry.isSymbolicLink()) {
        packageEntries.push({
          path: relativePath,
          kind: "SymbolicLink",
          mode: stat.mode & 0o777,
          identity: await readlink(path),
        });
      } else {
        throw new Error(`Unsupported caller-package fixture entry: ${relativePath}`);
      }
    }
  };
  await walk(fixture.packageRoot);
  const digest = async (path: string): Promise<string> =>
    new Bun.CryptoHasher("sha256").update(await Bun.file(path).bytes()).digest("hex");
  return {
    workspaceManifestDigest: await digest(join(fixture.workspaceRoot, "package.json")),
    ownerLockDigest: await digest(join(fixture.workspaceRoot, "bun.lock")),
    packageEntries,
  };
}

async function repositoryGuard(root: string): Promise<RepositoryGuard> {
  const status = decoder.decode(
    (
      await runHost(
        gitBinary,
        ["-C", root, "status", "--porcelain=v1", "--untracked-files=all"],
        root
      )
    ).stdout
  );
  const rootSymlinks: Array<{ readonly path: string; readonly target: string }> = [];
  for (const entry of await readdir(root)) {
    const path = join(root, entry);
    if ((await lstat(path)).isSymbolicLink()) {
      rootSymlinks.push({ path: entry, target: await readlink(path) });
    }
  }
  rootSymlinks.sort((left, right) => left.path.localeCompare(right.path));
  return { status, rootSymlinks };
}
