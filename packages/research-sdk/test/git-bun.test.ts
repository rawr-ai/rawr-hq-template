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
import { dirname, join } from "node:path";
import { Cause, Effect, Exit, Fiber, Layer, Option } from "effect";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  type ArtifactPathMapping,
  type BunPackageSubstrateIdentity,
  type ExactGitRevision,
  GitBun,
  type GitBunError,
  type GitPatchSubstrateIdentity,
  gitRepositoryIdentity,
  makeGitBunLayer,
  type PackedPackageDescriptor,
  type PatchDescriptor,
} from "../src/adapters/git-bun/index.js";
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
let gitSubstrate: GitPatchSubstrateIdentity;
let packageSubstrate: BunPackageSubstrateIdentity;
let gitFixture: GitFixture;
let changedProductPromise: Promise<ChangedProduct> | undefined;

describe.sequential("Git/Bun research artifact boundary", () => {
  beforeAll(async () => {
    repositoryRoot = await realpath(join(import.meta.dirname, "..", "..", ".."));
    const scratchParent = join(repositoryRoot, ".context", ".scratch", "research-sdk");
    await mkdir(scratchParent, { recursive: true });
    runRoot = await realpath(await mkdtemp(join(scratchParent, "git-bun-test-")));
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
    ({ gitSubstrate, packageSubstrate } = await runAdapter(
      Effect.map(GitBun, ({ gitSubstrate: git, packageSubstrate: package_ }) => ({
        gitSubstrate: git,
        packageSubstrate: package_,
      }))
    ));
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

  test("admits the exact resolved Git patch and Bun package substrates", () => {
    expect(gitSubstrate.git).toEqual({
      resolvedBinary: gitBinary,
      version: expectedGitVersion,
    });
    expect(packageSubstrate.bun).toEqual({
      resolvedBinary: bunBinary,
      version: expectedBunVersion,
      revision: expectedBunRevision,
    });
    expect(gitSubstrate.canonicalization.attributesPolicy).toContain("!filter");
    expect(gitSubstrate.canonicalization.diffArguments).toContain("--no-renames");
    expect(packageSubstrate.canonicalization.packArguments).toContain("--ignore-scripts");
    expect(Object.isFrozen(gitSubstrate)).toBe(true);
    expect(Object.isFrozen(gitSubstrate.git)).toBe(true);
    expect(Object.isFrozen(gitSubstrate.canonicalization)).toBe(true);
    expect(Object.isFrozen(gitSubstrate.canonicalization.diffArguments)).toBe(true);
    expect(Object.isFrozen(gitSubstrate.canonicalization.environment[0])).toBe(true);
    expect(Object.isFrozen(packageSubstrate)).toBe(true);
    expect(Object.isFrozen(packageSubstrate.bun)).toBe(true);
    expect(Object.isFrozen(packageSubstrate.canonicalization)).toBe(true);
    expect(Object.isFrozen(packageSubstrate.canonicalization.packArguments)).toBe(true);
    expect(Reflect.set(gitSubstrate.canonicalization.diffArguments, 0, "--evil")).toBe(false);
    expect(Reflect.set(packageSubstrate.canonicalization.environment[0]!, "value", "evil")).toBe(
      false
    );
    return runAdapter(
      Effect.map(GitBun, (service) => {
        expect(Object.isFrozen(service)).toBe(true);
        expect(Reflect.set(service, "packageSubstrate", gitSubstrate)).toBe(false);
      })
    );
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
    } finally {
      await unconfirmedRuntime.dispose();
    }
  });

  test("interruption publishes no product or package and removes operation controls", async () => {
    const packageFixture = await createPackageFixture(
      join(runRoot, "interrupted-package-fixture"),
      false
    );
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
      expect(await readdir(isolatedScratch)).toEqual([]);
    } finally {
      await interruptionRuntime.dispose();
    }
  }, 60_000);

  test("builds, packs, embeds, and verifies one exact installed registry closure", async () => {
    const fixture = await createPackageFixture(join(runRoot, "package-fixture"), false);
    const outputPath = join(runRoot, "artifacts", "fixture-research-sdk.tgz");
    const descriptor = await packFixture(fixture, outputPath);
    const graph = descriptor.runtimeGraph;
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

  test("rejects a build that mutates its owner lock before packing", async () => {
    const fixture = await createPackageFixture(join(runRoot, "drifting-package-fixture"), true);
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
  }, 60_000);

  test("does not traverse a hostile dist symlink or overwrite a final manifest symlink", async () => {
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
    await expect(readFile(target, "utf8")).resolves.toBe("owner-controlled sentinel\n");
    await expect(readlink(manifest)).resolves.toBe(target);
    await expect(pathExists(outputPath)).resolves.toBe(false);
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
