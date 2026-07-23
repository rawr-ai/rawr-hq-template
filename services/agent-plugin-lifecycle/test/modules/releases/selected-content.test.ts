import { mkdir, symlink, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { makeNodeContentWorkspacePort } from "@rawr/resource-content-workspace/providers/git-effect-platform-node";
import { afterEach, describe, expect, it } from "vitest";

import type { SelectedContentResolver } from "../../../src/service/model/dependencies/providers";
import type { CanonicalChannelSelection } from "../../../src/service/model/dto/current-main-selection";
import type { ContentWorkspacePolicy } from "../../../src/service/model/dto/releases/content-workspace";
import { createResourceSelectedContentResolver } from "../../../src/service/modules/releases/repository/selected-content";
import {
  canonicalSerializeAgentPluginReleaseInput,
  createAgentPluginPayload,
  createAgentPluginReleaseInput,
  parseContentAuthority,
  parseGitCommitId,
  parseGitTreeId,
  parsePluginId,
  parseReleaseRelativePath,
  parseRepositoryIdentity,
} from "../../../src/service/shared/release";
import { GIT_EXECUTABLE, git } from "../../support/git-repository";
import {
  createOwnedFixtureRoot,
  disposeOwnedFixtureRoot,
  type OwnedFixtureRoot,
} from "../../support/owned-fixture-root";

const TAG = "refs/tags/agent-plugins-v1";
const REPOSITORY_URL = "https://github.com/rawr-ai/rawr-hq.git";
const encoder = new TextEncoder();

describe("selected release content", () => {
  let ownedRoot: OwnedFixtureRoot | undefined;

  afterEach(async () => {
    if (ownedRoot !== undefined) await disposeOwnedFixtureRoot(ownedRoot);
    ownedRoot = undefined;
  });

  it("resolves one exact tag twice without consulting checkout state", async () => {
    const fixture = await createRepository(await root(), ["cognition", "docs"]);
    await mkdir(join(fixture.root, "unrelated-tree"), { mode: 0o700 });
    await Promise.all(
      Array.from({ length: 512 }, (_, index) =>
        writeFile(join(fixture.root, "unrelated-tree", `entry-${index}.txt`), `${index}\n`)
      )
    );
    await symlink("missing-target", join(fixture.root, "unrelated-link"));
    const scopedSelection = await commitAndRetag(fixture, "add unrelated committed tree");
    await writeFile(join(fixture.root, "unrelated.txt"), "dirty but unrelated\n");
    const delegate = makeNodeContentWorkspacePort({ gitExecutable: GIT_EXECUTABLE });
    const treeSelections: string[][] = [];
    const resolver = createResourceSelectedContentResolver({
      contentWorkspace: {
        ...delegate,
        inspectGitWorkspace: async () => {
          throw new Error("Channel resolution must not inspect checkout state");
        },
        async readGitTree(input) {
          treeSelections.push([...input.paths]);
          return await delegate.readGitTree(input);
        },
      },
    });

    const first = await resolver.resolveChannel({
      locator: fixture.locator,
      selection: scopedSelection,
    });
    const second = await resolver.resolveChannel({
      locator: fixture.locator,
      selection: scopedSelection,
    });

    expect(first).toEqual(second);
    expect(treeSelections).toEqual([
      [".rawr/release-input.json", ".agents/plugins", ".claude-plugin", "plugins/agents"],
      [".rawr/release-input.json", ".agents/plugins", ".claude-plugin", "plugins/agents"],
    ]);
    expect(first).toMatchObject({
      kind: "Selected",
      content: {
        releaseSetDigest: expect.stringMatching(/^rs1_[0-9a-f]{64}$/u),
        members: [{ pluginId: "cognition" }, { pluginId: "docs" }],
        marketplace: {
          identity: "rawr-hq",
          source: {
            kind: "git",
            repositoryUrl: REPOSITORY_URL,
            revision: scopedSelection.contentCommit,
            sparsePaths: [".agents/plugins", ".claude-plugin", "plugins/agents"],
          },
        },
      },
    });
  });

  it("rejects a tag that moves before the closing observation", async () => {
    const fixture = await createRepository(await root(), ["cognition"]);
    await writeFile(join(fixture.root, "later.txt"), "later\n");
    await git(fixture.root, ["add", "later.txt"]);
    await git(fixture.root, ["commit", "-m", "later"]);
    const laterCommit = await git(fixture.root, ["rev-parse", "HEAD"]);
    const delegate = makeNodeContentWorkspacePort({ gitExecutable: GIT_EXECUTABLE });
    let moved = false;
    const resolver = createResourceSelectedContentResolver({
      contentWorkspace: {
        ...delegate,
        async readGitBlobs(input) {
          const result = await delegate.readGitBlobs(input);
          if (!moved) {
            moved = true;
            await git(fixture.root, ["tag", "--force", "agent-plugins-v1", laterCommit]);
          }
          return result;
        },
      },
    });

    await expect(
      resolver.resolveChannel({ locator: fixture.locator, selection: fixture.selection })
    ).resolves.toMatchObject({
      kind: "Rejected",
      issues: [{ code: "SelectionMismatch" }],
    });
  });

  it("rejects undeclared payload files and missing native marketplace manifests", async () => {
    const extra = await createRepository(await root(), ["cognition"]);
    await writeFile(join(extra.root, "plugins/agents/cognition/extra.txt"), "extra\n");
    const extraSelection = await commitAndRetag(extra, "add undeclared payload");
    const resolver = realResolver();
    await expect(
      resolver.resolveChannel({ locator: extra.locator, selection: extraSelection })
    ).resolves.toMatchObject({
      kind: "Rejected",
      issues: [{ code: "SourceIneligible", detail: expect.stringContaining("undeclared") }],
    });

    await unlink(join(extra.root, ".agents/plugins/marketplace.json"));
    await unlink(join(extra.root, "plugins/agents/cognition/extra.txt"));
    const missingSelection = await commitAndRetag(extra, "remove native marketplace manifest");
    await expect(
      resolver.resolveChannel({ locator: extra.locator, selection: missingSelection })
    ).resolves.toMatchObject({
      kind: "Rejected",
      issues: [
        {
          code: "SourceIneligible",
          detail: expect.stringContaining(".agents/plugins/marketplace.json"),
        },
      ],
    });
  });

  it("rejects marketplace membership, source, and JSON mismatches", async () => {
    const fixture = await createRepository(await root(), ["cognition", "docs"]);
    const resolver = realResolver();

    await writeNativeMarketplaces(fixture.root, ["cognition"]);
    const missingMember = await commitAndRetag(fixture, "remove marketplace member");
    await expect(
      resolver.resolveChannel({ locator: fixture.locator, selection: missingMember })
    ).resolves.toMatchObject({
      kind: "Rejected",
      issues: [{ code: "SourceIneligible", detail: expect.stringContaining("plugin set") }],
    });

    await writeNativeMarketplaces(fixture.root, ["cognition", "docs"], {
      codexSourceFor: (pluginId) =>
        pluginId === "cognition" ? "./plugins/agents/docs" : `./plugins/agents/${pluginId}`,
    });
    const wrongSource = await commitAndRetag(fixture, "change marketplace source");
    await expect(
      resolver.resolveChannel({ locator: fixture.locator, selection: wrongSource })
    ).resolves.toMatchObject({
      kind: "Rejected",
      issues: [{ code: "SourceIneligible", detail: expect.stringContaining("source") }],
    });

    await writeNativeMarketplaces(fixture.root, ["cognition", "docs"]);
    await writeFile(join(fixture.root, ".claude-plugin/marketplace.json"), "{not-json}\n");
    const malformed = await commitAndRetag(fixture, "malform marketplace JSON");
    await expect(
      resolver.resolveChannel({ locator: fixture.locator, selection: malformed })
    ).resolves.toMatchObject({
      kind: "Rejected",
      issues: [{ code: "SourceIneligible", detail: expect.stringContaining("UTF-8 JSON") }],
    });
  });

  it("reuses the exact workspace snapshot and selects only requested members", async () => {
    const fixture = await createRepository(await root(), ["cognition", "docs"]);
    const resolver = realResolver();
    const input: Parameters<SelectedContentResolver["resolveWorkspace"]>[0] = {
      contentWorkspace: fixture.policy,
      mode: { kind: "targeted", pluginIds: [requirePluginId("docs")] },
    };

    const first = await resolver.resolveWorkspace(input);
    const second = await resolver.resolveWorkspace(input);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      kind: "Selected",
      content: {
        releaseSetDigest: null,
        members: [{ pluginId: "docs" }],
        marketplace: { identity: "rawr-hq", source: { kind: "local", root: fixture.root } },
      },
    });
  });

  async function root(): Promise<OwnedFixtureRoot> {
    ownedRoot = await createOwnedFixtureRoot();
    return ownedRoot;
  }
});

interface RepositoryFixture {
  readonly root: string;
  readonly policy: ContentWorkspacePolicy;
  readonly locator: Parameters<SelectedContentResolver["resolveChannel"]>[0]["locator"];
  readonly selection: CanonicalChannelSelection;
}

async function createRepository(
  fixture: OwnedFixtureRoot,
  pluginNames: readonly string[]
): Promise<RepositoryFixture> {
  const root = join(fixture.path, "repository");
  await mkdir(root, { mode: 0o700 });
  const contentAuthority = must(parseContentAuthority("rawr-hq"));
  const repositoryIdentity = must(parseRepositoryIdentity("github:rawr-ai/rawr-hq"));
  const members = pluginNames.map((pluginName) => {
    const pluginId = requirePluginId(pluginName);
    const skillPath = must(parseReleaseRelativePath(`skills/${pluginId}/SKILL.md`));
    const payload = must(
      createAgentPluginPayload([
        {
          path: must(parseReleaseRelativePath(".claude-plugin/plugin.json")),
          mode: 0o644,
          bytes: encoder.encode(`{"name":"${pluginId}"}\n`),
        },
        {
          path: must(parseReleaseRelativePath(".codex-plugin/plugin.json")),
          mode: 0o644,
          bytes: encoder.encode(`{"name":"${pluginId}"}\n`),
        },
        { path: skillPath, mode: 0o644, bytes: encoder.encode(`# ${pluginId}\n`) },
      ])
    );
    return { pluginId, skillPath, payload };
  });
  const releaseInput = must(
    createAgentPluginReleaseInput({
      schemaVersion: 1,
      contentAuthority,
      members: members.map(({ pluginId, skillPath, payload }) => ({
        kind: "agent-plugin",
        pluginId,
        skillInventory: [{ identity: `${pluginId}-skill`, manifestPath: skillPath }],
        payload: {
          protocolVersion: 1,
          manifest: payload.manifest,
          payloadDigest: payload.payloadDigest,
        },
        vendor: [],
        curation: [],
      })),
      ownershipClaims: members.map(({ pluginId }) => ({
        kind: "skill",
        identity: `${pluginId}-skill`,
        ownerPluginId: pluginId,
      })),
      locks: [],
      qualityPolicies: [],
    })
  );
  await write(
    join(root, ".rawr/release-input.json"),
    canonicalSerializeAgentPluginReleaseInput(releaseInput)
  );
  await writeNativeMarketplaces(
    root,
    members.map(({ pluginId }) => pluginId)
  );
  for (const { pluginId, payload } of members) {
    for (const entry of payload.entries) {
      await write(
        join(root, "plugins/agents", pluginId, ...entry.path.split("/")),
        Buffer.from(entry.bytesBase64, "base64")
      );
    }
  }
  await git(root, ["init", "-b", "main"]);
  await git(root, ["config", "user.email", "fixture@example.invalid"]);
  await git(root, ["config", "user.name", "Selected Content Fixture"]);
  await git(root, ["remote", "add", "origin", REPOSITORY_URL]);
  await git(root, ["add", "--all"]);
  await git(root, ["commit", "-m", "selected content"]);
  await git(root, ["tag", "agent-plugins-v1"]);
  const commit = must(parseGitCommitId(await git(root, ["rev-parse", "HEAD"])));
  const tree = must(parseGitTreeId(await git(root, ["rev-parse", "HEAD^{tree}"])));
  const policy: ContentWorkspacePolicy = Object.freeze({
    locator: root,
    repositoryIdentity,
    contentAuthority,
    remoteName: "origin",
    remoteUrl: REPOSITORY_URL,
    refName: "refs/heads/main",
    sourceCommit: commit,
    sourceTree: tree,
    releaseInputPath: must(parseReleaseRelativePath(".rawr/release-input.json")),
    pluginRoot: must(parseReleaseRelativePath("plugins/agents")),
  });
  return {
    root,
    policy,
    locator: Object.freeze({ workspacePath: root, expectedRepositoryIdentity: repositoryIdentity }),
    selection: selection(policy, releaseInput.releaseInputDigest),
  };
}

async function commitAndRetag(
  fixture: RepositoryFixture,
  message: string
): Promise<CanonicalChannelSelection> {
  await git(fixture.root, ["add", "--all"]);
  await git(fixture.root, ["commit", "-m", message]);
  await git(fixture.root, ["tag", "--force", "agent-plugins-v1"]);
  const commit = must(parseGitCommitId(await git(fixture.root, ["rev-parse", "HEAD"])));
  const tree = must(parseGitTreeId(await git(fixture.root, ["rev-parse", "HEAD^{tree}"])));
  return Object.freeze({ ...fixture.selection, contentCommit: commit, contentTree: tree });
}

function selection(
  policy: ContentWorkspacePolicy,
  releaseInputDigest: CanonicalChannelSelection["releaseInputDigest"]
): CanonicalChannelSelection {
  return Object.freeze({
    schemaVersion: 3,
    channel: "current-main",
    contentAuthority: policy.contentAuthority,
    sourceRepositoryIdentity: policy.repositoryIdentity,
    sourceRepositoryUrl: REPOSITORY_URL,
    sourceRef: TAG,
    contentCommit: policy.sourceCommit,
    contentTree: policy.sourceTree,
    releaseInputDigest,
  });
}

function realResolver(): SelectedContentResolver {
  return createResourceSelectedContentResolver({
    contentWorkspace: makeNodeContentWorkspacePort({ gitExecutable: GIT_EXECUTABLE }),
  });
}

async function write(path: string, bytes: Uint8Array): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(path, bytes);
}

async function writeNativeMarketplaces(
  root: string,
  pluginIds: readonly string[],
  override: Readonly<{
    codexSourceFor?: (pluginId: string) => string;
  }> = {}
): Promise<void> {
  const codex = {
    name: "rawr-hq",
    plugins: pluginIds.map((pluginId) => ({
      name: pluginId,
      source: {
        source: "local",
        path: override.codexSourceFor?.(pluginId) ?? `./plugins/agents/${pluginId}`,
      },
      policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
      category: "agent",
    })),
  };
  const claude = {
    $schema: "https://anthropic.com/claude-code/marketplace.schema.json",
    name: "rawr-hq",
    owner: { name: "RAWR HQ" },
    plugins: pluginIds.map((pluginId) => ({
      name: pluginId,
      source: `./plugins/agents/${pluginId}`,
      description: `${pluginId} agent plugin`,
    })),
  };
  await write(
    join(root, ".agents/plugins/marketplace.json"),
    encoder.encode(`${JSON.stringify(codex, null, 2)}\n`)
  );
  await write(
    join(root, ".claude-plugin/marketplace.json"),
    encoder.encode(`${JSON.stringify(claude, null, 2)}\n`)
  );
}

function requirePluginId(value: string) {
  return must(parsePluginId(value));
}

function must<Value>(
  result: Readonly<{ ok: true; value: Value }> | Readonly<{ ok: false; issues: readonly unknown[] }>
): Value {
  if (!result.ok) throw new Error("Selected-content fixture construction failed");
  return result.value;
}
