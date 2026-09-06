import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { type Static, type TSchema, Type } from "typebox";
import { Value } from "typebox/value";
import { expect } from "vitest";
import {
  type AgentPluginNativeBinaries,
  createAgentPluginNativeFixture,
} from "./agent-plugin-native-fixture";
import {
  assertAgentPluginTrace,
  receiveAgentPluginTelemetry,
  runAgentPluginCommand,
} from "./agent-plugin-telemetry-matrix";

const execFileAsync = promisify(execFile);
const encoder = new TextEncoder();
const ResultSchema = Type.Object({ operation: Type.String(), result: Type.Unknown() });
const EnvelopeSchema = Type.Object({
  body: Type.Object({
    contentAuthority: Type.String(),
    members: Type.Array(Type.Object({ pluginId: Type.String() })),
    ownershipClaims: Type.Array(Type.Unknown()),
  }),
  releaseInputDigest: Type.String({ pattern: "^ri1_[a-f0-9]{64}$" }),
});
const ProviderResultSchema = Type.Object({
  operation: Type.String(),
  classification: Type.String(),
  selection: Type.Object({
    repositoryIdentity: Type.String(),
    sourceCommit: Type.String(),
    sourceTree: Type.String(),
    releaseInputDigest: Type.String(),
    releaseSetDigest: Type.Union([Type.String(), Type.Null()]),
    pluginIds: Type.Array(Type.String()),
  }),
  targets: Type.Array(
    Type.Object({
      target: Type.Object({ provider: Type.String(), home: Type.String() }),
      classification: Type.String(),
      operations: Type.Array(Type.Object({ kind: Type.String() })),
      facts: Type.Array(
        Type.Object({ kind: Type.String(), subject: Type.String(), detail: Type.String() })
      ),
      issues: Type.Array(Type.Unknown()),
    })
  ),
  issues: Type.Array(Type.Unknown()),
});
const CodexInventorySchema = Type.Object({
  installed: Type.Array(
    Type.Object({
      pluginId: Type.String(),
      installed: Type.Boolean(),
      enabled: Type.Boolean(),
      version: Type.String(),
    })
  ),
});
const ClaudeInventorySchema = Type.Array(
  Type.Object({
    id: Type.String(),
    scope: Type.String(),
    enabled: Type.Boolean(),
    version: Type.String(),
    installPath: Type.String(),
  })
);

type ProviderResult = Static<typeof ProviderResultSchema>;

/** Exercises only the installed command boundary against owned Git and real native homes. */
export async function verifyAgentPluginNativeLifecycle(input: {
  readonly cliRoot: string;
  readonly root: string;
  readonly binaries: AgentPluginNativeBinaries;
  readonly signal?: AbortSignal;
}) {
  input.signal?.throwIfAborted();
  const fixture = await createAgentPluginNativeFixture(input.root, input.binaries, input.signal);
  input.signal?.throwIfAborted();
  const telemetry = await receiveAgentPluginTelemetry();
  const instances = new Set<string>();
  const receipts: { command: string; procedure: string; code: number }[] = [];
  const env: NodeJS.ProcessEnv = { ...fixture.env, HABITAT_TELEMETRY: telemetry.configuration };
  const stagedFlags = [
    "--content-workspace",
    fixture.workspaceRoot,
    "--repository-identity",
    fixture.expectedRepositoryIdentity,
    "--content-authority",
    fixture.contentAuthority,
    "--remote-name",
    fixture.remoteName,
    "--remote-url",
    fixture.remoteUrl,
    "--ref",
    fixture.refName,
    "--release-input",
    fixture.releaseInputPath,
    "--plugin-root",
    fixture.pluginRoot,
  ];
  const locatorFlags = [
    "--content-workspace",
    fixture.workspaceRoot,
    "--repository-identity",
    fixture.expectedRepositoryIdentity,
  ];
  const targetFlags = (homes: Readonly<{ codex: string; claude: string }>) => [
    "--target",
    `codex=${homes.codex}`,
    "--target",
    `claude=${homes.claude}`,
  ];
  const channelFlags = [
    "--channel",
    "current-main",
    ...locatorFlags,
    ...targetFlags(fixture.homes),
  ];
  const initialNativeOperations = [
    { kind: "marketplace-added", identity: fixture.marketplaceIdentity },
    { kind: "plugin-installed", selector: fixture.selector },
  ];
  const run = async (
    command: string,
    procedure: string,
    flags: readonly string[],
    code = 0,
    stdin?: Uint8Array
  ) => {
    input.signal?.throwIfAborted();
    telemetry.requests.length = 0;
    const result = await runAgentPluginCommand({
      cliRoot: input.cliRoot,
      cwd: fixture.workspaceRoot,
      env,
      args: ["agent", "plugins", ...command.split(":"), ...flags],
      stdin,
      timeoutMs: 90_000,
      signal: input.signal,
    });
    const context = `${command} ${flags.join(" ")}\n${result.stdout}\n${result.stderr}`;
    expect(result.code, context).toBe(code);
    expect(result.stderr, context).toBe("");
    expect(telemetry.errors).toEqual([]);
    const instance = assertAgentPluginTrace({
      requests: telemetry.requests,
      commandId: `agent:plugins:${command}`,
      procedure,
    });
    expect(instances.has(instance)).toBe(false);
    instances.add(instance);
    receipts.push({ command, procedure, code });
    return result.stdout;
  };
  const json = async (
    command: string,
    procedure: string,
    flags: readonly string[],
    code = 0,
    stdin?: Uint8Array
  ) => {
    const stdout = await run(command, procedure, [...flags, "--json"], code, stdin);
    const result = checked(ResultSchema, JSON.parse(stdout));
    expect(result.operation).toBe(procedure);
    expect(stdout).toBe(`${JSON.stringify(result)}\n`);
    return result.result;
  };
  const git = async (args: readonly string[]) => {
    input.signal?.throwIfAborted();
    const result = await execFileAsync(input.binaries.git, [...args], {
      cwd: fixture.workspaceRoot,
      env: fixture.env,
      encoding: "utf8",
      timeout: 10_000,
      maxBuffer: 1024 * 1024,
      killSignal: "SIGKILL",
    });
    input.signal?.throwIfAborted();
    return result.stdout.trim();
  };
  const write = async (relative: string, bytes: string | Uint8Array) => {
    input.signal?.throwIfAborted();
    const path = join(fixture.workspaceRoot, relative);
    await mkdir(dirname(path), { recursive: true });
    input.signal?.throwIfAborted();
    await writeFile(path, bytes, { mode: 0o644 });
  };
  const inventory = async (homes: Readonly<{ codex: string; claude: string }>) => {
    input.signal?.throwIfAborted();
    const nativeEnv = { ...fixture.env, CODEX_HOME: homes.codex, CLAUDE_CONFIG_DIR: homes.claude };
    const options = {
      cwd: fixture.workspaceRoot,
      env: nativeEnv,
      encoding: "utf8" as const,
      timeout: 15_000,
      maxBuffer: 1024 * 1024,
      killSignal: "SIGKILL" as const,
    };
    const codex = await execFileAsync(input.binaries.codex, ["plugin", "list", "--json"], options);
    input.signal?.throwIfAborted();
    const claude = await execFileAsync(
      input.binaries.claude,
      ["plugin", "list", "--json"],
      options
    );
    input.signal?.throwIfAborted();
    expect(codex.stderr).toBe("");
    expect(claude.stderr).toBe("");
    return {
      codex: checked(CodexInventorySchema, JSON.parse(codex.stdout)),
      claude: checked(ClaudeInventorySchema, JSON.parse(claude.stdout)),
    };
  };
  const assertInstalled = async (homes: Readonly<{ codex: string; claude: string }>) => {
    const observed = await inventory(homes);
    expect(observed.codex.installed).toHaveLength(1);
    expect(observed.codex.installed[0]).toMatchObject({
      pluginId: fixture.selector,
      installed: true,
      enabled: true,
      version: "0.0.1",
    });
    expect(observed.claude).toHaveLength(1);
    expect(observed.claude[0]).toMatchObject({
      id: fixture.selector,
      enabled: true,
      scope: "user",
      version: "0.0.1",
    });
    for (const home of Object.values(homes)) {
      for (const relative of pluginFiles) {
        const cached = join(
          home,
          "plugins/cache",
          fixture.marketplaceIdentity,
          fixture.pluginName,
          "0.0.1",
          relative
        );
        const source = join(
          fixture.workspaceRoot,
          fixture.pluginRoot,
          fixture.pluginName,
          relative
        );
        expect(await readFile(cached)).toEqual(await readFile(source));
      }
    }
    return observed;
  };

  try {
    const empty = await inventory(fixture.homes);
    expect(empty.codex.installed).toEqual([]);
    expect(empty.claude).toEqual([]);
    const blocked = await json("status", "providers.status", channelFlags, 2);
    expect(blocked).toMatchObject({
      operation: "status",
      classification: "Blocked",
      selection: null,
      issues: [expect.objectContaining({ code: "SelectionRejected" })],
      targets: [
        {
          target: { provider: "claude", home: fixture.homes.claude },
          classification: "Blocked",
          facts: [],
          operations: [],
        },
        {
          target: { provider: "codex", home: fixture.homes.codex },
          classification: "Blocked",
          facts: [],
          operations: [],
        },
      ],
    });
    expect(await inventory(fixture.homes)).toEqual(empty);

    const body = {
      schemaVersion: 1,
      contentAuthority: fixture.contentAuthority,
      members: [{ kind: "agent-plugin", pluginId: fixture.pluginName, vendor: [], curation: [] }],
      ownershipClaims: [],
      locks: [],
      qualityPolicies: [],
    };
    const encoded = await run(
      "check",
      "releases.releaseInputRecord",
      ["--mode", "release-input-record"],
      0,
      encoder.encode(JSON.stringify(body))
    );
    const encodedEnvelope = checked(EnvelopeSchema, JSON.parse(encoded));
    expect(encodedEnvelope.body).toEqual(body);
    expect(encoded.endsWith("\n")).toBe(true);
    expect(
      await run(
        "check",
        "releases.releaseInputRecord",
        ["--mode", "release-input-record"],
        0,
        encoder.encode(encoded)
      )
    ).toBe(encoded);
    await write(fixture.releaseInputPath, encoded);
    await git(["add", "--all"]);

    const beforeRefresh = await git(["write-tree"]);
    const refreshed = checked(
      Type.Object({
        kind: Type.Literal("ReleaseInputCandidateReady"),
        envelopeText: Type.String(),
        releaseInputDigest: Type.String(),
        byteLength: Type.Number(),
      }),
      await json("check", "releases.refreshReleaseInput", [
        "--mode",
        "release-input-refresh",
        ...stagedFlags,
        "--member",
        fixture.pluginName,
      ])
    );
    expect(await git(["write-tree"])).toBe(beforeRefresh);
    expect(await readFile(join(fixture.workspaceRoot, fixture.releaseInputPath), "utf8")).toBe(
      encoded
    );
    const releaseInput = checked(EnvelopeSchema, JSON.parse(refreshed.envelopeText));
    expect(releaseInput.body.ownershipClaims).toEqual([
      { kind: "skill", identity: "fixture", ownerPluginId: fixture.pluginName },
    ]);
    expect(releaseInput.releaseInputDigest).toBe(refreshed.releaseInputDigest);
    expect(encoder.encode(refreshed.envelopeText).byteLength).toBe(refreshed.byteLength);
    await write(fixture.releaseInputPath, refreshed.envelopeText);
    await git(["add", "--all"]);
    expect(
      await run("check", "releases.refreshReleaseInput", [
        "--mode",
        "release-input-refresh",
        ...stagedFlags,
        "--member",
        fixture.pluginName,
      ])
    ).toBe(refreshed.envelopeText);
    expect(
      await json("check", "releases.checkRepository", [
        "--mode",
        "repository-staged",
        ...stagedFlags,
      ])
    ).toMatchObject({
      kind: "StagedRepositoryEligible",
      repositoryIdentity: fixture.expectedRepositoryIdentity,
      refName: fixture.refName,
    });
    await git(["commit", "-m", "Review installed CLI release input"]);
    const sourceCommit = await git(["rev-parse", "HEAD^{commit}"]);
    const sourceTree = await git(["rev-parse", "HEAD^{tree}"]);
    const cleanFlags = [
      ...stagedFlags,
      "--source-commit",
      sourceCommit,
      "--source-tree",
      sourceTree,
    ];
    expect(
      await json("check", "releases.checkRepository", ["--mode", "repository-clean", ...cleanFlags])
    ).toMatchObject({
      kind: "CleanRepositoryEligible",
      repositoryIdentity: fixture.expectedRepositoryIdentity,
      sourceCommit,
      sourceTree,
    });
    for (const selector of [["--plugin", fixture.pluginName], ["--complete-set"]]) {
      expect(
        await json("check", "releases.check", ["--mode", "release", ...cleanFlags, ...selector])
      ).toMatchObject({ kind: "EligibleReport" });
    }

    const output = join(fixture.packageOutputRoot, "fixture.zip");
    const packageFlags = [
      ...cleanFlags,
      "--plugin",
      fixture.pluginName,
      "--format",
      "cowork-v1",
      "--output",
      output,
    ];
    const packaged = checked(
      Type.Object({ kind: Type.Literal("OutputReplacedVerified"), packageDigest: Type.String() }),
      await json("package", "packaging.package", packageFlags)
    );
    const archive = await readFile(output);
    expect(packaged.packageDigest).toBe(
      `pkg1_${createHash("sha256").update(archive).digest("hex")}`
    );
    const published = await lstat(output);
    expect(published.mode & 0o777).toBe(0o644);
    input.signal?.throwIfAborted();
    const listing = await execFileAsync("/usr/bin/unzip", ["-Z1", output], {
      env: fixture.env,
      encoding: "utf8",
      timeout: 10_000,
      killSignal: "SIGKILL",
      maxBuffer: 1024 * 1024,
    });
    input.signal?.throwIfAborted();
    expect(listing.stdout.trim().split("\n")).toEqual(pluginFiles);
    for (const relative of pluginFiles) {
      input.signal?.throwIfAborted();
      const extracted = await execFileAsync("/usr/bin/unzip", ["-p", output, relative], {
        env: fixture.env,
        encoding: "buffer",
        timeout: 10_000,
        killSignal: "SIGKILL",
        maxBuffer: 1024 * 1024,
      });
      input.signal?.throwIfAborted();
      expect(extracted.stdout).toEqual(
        await readFile(
          join(fixture.workspaceRoot, fixture.pluginRoot, fixture.pluginName, relative)
        )
      );
    }
    expect(await json("package", "packaging.package", packageFlags)).toMatchObject({
      kind: "ReadOnlyConverged",
      packageDigest: packaged.packageDigest,
    });
    expect(await readFile(output)).toEqual(archive);
    expect((await lstat(output)).ino).toBe(published.ino);
    expect((await lstat(output)).mtimeMs).toBe(published.mtimeMs);

    const testFlags = [
      ...cleanFlags,
      "--complete-set",
      "--disposable-root",
      fixture.disposableRoot,
      ...targetFlags(fixture.disposableHomes),
    ];
    const tested = checked(ProviderResultSchema, await json("test", "providers.test", testFlags));
    assertProviderResult(
      tested,
      "test",
      "Changed",
      fixture.disposableHomes,
      initialNativeOperations
    );
    await assertInstalled(fixture.disposableHomes);
    const testedAgain = checked(
      ProviderResultSchema,
      await json("test", "providers.test", testFlags)
    );
    assertProviderResult(testedAgain, "test", "Converged", fixture.disposableHomes);
    expect(testedAgain.targets.flatMap((target) => target.operations)).toEqual([]);
    await assertInstalled(fixture.disposableHomes);
    expect(await inventory(fixture.homes)).toEqual(empty);

    const sourceRef = "refs/tags/native-fixture-v1";
    await git(["tag", sourceRef.slice("refs/tags/".length), sourceCommit]);
    const channelBody = {
      schemaVersion: 3,
      channel: "current-main",
      contentAuthority: fixture.contentAuthority,
      sourceRepositoryIdentity: fixture.expectedRepositoryIdentity,
      sourceRepositoryUrl: fixture.repositoryUrl,
      sourceRef,
      contentCommit: sourceCommit,
      contentTree: sourceTree,
      releaseInputDigest: releaseInput.releaseInputDigest,
    };
    const record = await run("check", "governance.currentMainRecord", [
      "--mode",
      "current-main-record",
      "--current-main-body-json",
      JSON.stringify(channelBody),
    ]);
    expect(JSON.parse(record)).toEqual(channelBody);
    expect(
      await run("check", "governance.currentMainRecord", [
        "--mode",
        "current-main-record",
        "--current-main-record-json",
        record,
      ])
    ).toBe(record);
    await write(".habitat/agent-plugin-lifecycle/channels/current-main.json", record);
    await git(["add", "--all"]);
    await git(["commit", "-m", "Review installed CLI current-main selection"]);
    expect(
      await json("check", "governance.currentMainSelection", [
        "--mode",
        "current-main-selection",
        ...locatorFlags,
      ])
    ).toEqual({ kind: "CURRENT_ELIGIBLE", selection: channelBody });

    const drifted = checked(
      ProviderResultSchema,
      await json("status", "providers.status", channelFlags, 1)
    );
    expect(drifted.classification).toBe("Drifted");
    expect(drifted.targets.flatMap((target) => target.operations)).toEqual([]);
    expect(await inventory(fixture.homes)).toEqual(empty);
    const synced = checked(
      ProviderResultSchema,
      await json("sync", "providers.sync", channelFlags)
    );
    assertProviderResult(synced, "sync", "Changed", fixture.homes, initialNativeOperations);
    expect(synced.selection).toMatchObject({
      sourceCommit,
      sourceTree,
      releaseInputDigest: releaseInput.releaseInputDigest,
      pluginIds: [fixture.pluginName],
    });
    const installed = await assertInstalled(fixture.homes);
    const syncedAgain = checked(
      ProviderResultSchema,
      await json("sync", "providers.sync", channelFlags)
    );
    assertProviderResult(syncedAgain, "sync", "Converged", fixture.homes);
    expect(syncedAgain.targets.flatMap((target) => target.operations)).toEqual([]);
    const status = checked(
      ProviderResultSchema,
      await json("status", "providers.status", channelFlags)
    );
    assertProviderResult(status, "status", "Converged", fixture.homes);
    expect(status.targets.flatMap((target) => target.operations)).toEqual([]);
    expect(await assertInstalled(fixture.homes)).toEqual(installed);

    const beforeVendor = await snapshotFiles(fixture.workspaceRoot);
    const gitTrace = join(fixture.root, "vendor-git-trace.jsonl");
    env.GIT_TRACE2_EVENT = gitTrace;
    const vendor = await json(
      "vendors:update",
      "vendors.update",
      [
        ...locatorFlags,
        "--content-authority",
        fixture.contentAuthority,
        "--remote-url",
        fixture.remoteUrl,
        "--ref",
        fixture.refName,
        "--source-commit",
        await git(["rev-parse", "HEAD^{commit}"]),
        "--source-tree",
        await git(["rev-parse", "HEAD^{tree}"]),
        "--release-input",
        fixture.releaseInputPath,
        "--source",
        "not-declared",
      ],
      1
    );
    expect(vendor).toEqual({
      kind: "Rejected",
      sourceIds: ["not-declared"],
      issues: [
        {
          code: "UndeclaredSource",
          sourceId: "not-declared",
          detail: "Vendor source not-declared is absent from the canonical release input.",
        },
      ],
    });
    expect(await snapshotFiles(fixture.workspaceRoot)).toEqual(beforeVendor);
    const nativeGit = (await readFile(gitTrace, "utf8"))
      .trim()
      .split("\n")
      .map((line) =>
        checked(
          Type.Object({ event: Type.String(), argv: Type.Optional(Type.Array(Type.String())) }),
          JSON.parse(line)
        )
      )
      .filter((event) => event.event === "start");
    expect(nativeGit.length).toBeGreaterThan(0);
    expect(nativeGit.flatMap((event) => event.argv ?? [])).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/^(?:fetch|ls-remote|clone|push)$/)])
    );
    expect(await git(["status", "--porcelain"])).toBe("");
    expect(receipts.map((receipt) => receipt.command)).toEqual(
      expect.arrayContaining(["check", "package", "status", "sync", "test", "vendors:update"])
    );
    return Object.freeze({ receipts: Object.freeze(receipts), processInstances: instances.size });
  } finally {
    await telemetry.close();
  }
}

const pluginFiles = [
  ".claude-plugin/plugin.json",
  ".codex-plugin/plugin.json",
  "skills/fixture/SKILL.md",
];

function checked<const Schema extends TSchema>(schema: Schema, value: unknown): Static<Schema> {
  Value.Assert(schema, value);
  return value;
}

function assertProviderResult(
  result: ProviderResult,
  operation: string,
  classification: string,
  homes: Readonly<{ codex: string; claude: string }>,
  expectedOperations: readonly unknown[] = []
) {
  expect(result.operation).toBe(operation);
  expect(result.classification, JSON.stringify(result)).toBe(classification);
  expect(result.issues).toEqual([]);
  expect(result.targets.map((target) => target.target)).toEqual([
    { provider: "claude", home: homes.claude },
    { provider: "codex", home: homes.codex },
  ]);
  for (const target of result.targets) {
    expect(target.classification).toBe(classification);
    expect(target.issues).toEqual([]);
    expect(target.facts.map((fact) => fact.kind)).toEqual(
      expect.arrayContaining(["marketplace-source", "plugin-installed", "plugin-file"])
    );
    expect(target.operations).toEqual(expectedOperations);
  }
}

/** Ignores Git's observation lock/stat cache, not any versioned or untracked content. */
async function snapshotFiles(root: string): Promise<readonly unknown[]> {
  const output: unknown[] = [];
  for (const entry of (await readdir(root, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name)
  )) {
    if (entry.name === ".git") continue;
    const path = join(root, entry.name);
    if (entry.isDirectory()) output.push([entry.name, await snapshotFiles(path)]);
    else
      output.push([
        entry.name,
        (await lstat(path)).mode & 0o777,
        createHash("sha256")
          .update(await readFile(path))
          .digest("hex"),
      ]);
  }
  return output;
}
