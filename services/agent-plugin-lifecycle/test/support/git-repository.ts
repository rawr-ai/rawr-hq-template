import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import type { Client } from "../../src/client";
import {
  type ContentAuthority,
  canonicalSerializeAgentPluginReleaseInput,
  createAgentPluginPayload,
  createAgentPluginReleaseInput,
  type GitCommitId,
  type GitTreeId,
  type PluginId,
  parseContentAuthority,
  parseGitCommitId,
  parseGitTreeId,
  parsePluginId,
  parseReleaseRelativePath,
  parseRepositoryIdentity,
  type ReleaseRelativePath,
  type RepositoryIdentity,
} from "../../src/service/shared/release";

type ContentWorkspacePolicy = Parameters<Client["releases"]["check"]>[0]["contentWorkspace"];
type GitRepositoryFixtureRoot = Readonly<{ path: string }>;

const execFileAsync = promisify(execFile);

export const GIT_EXECUTABLE = "/usr/bin/git";

export interface GeneratedGitRepository {
  readonly root: string;
  readonly policy: ContentWorkspacePolicy;
  readonly pluginId: PluginId;
  readonly releaseInputFile: string;
  readonly payloadFile: string;
  readonly ignoredFile: string;
}

export interface GeneratedMultiMemberGitRepository extends GeneratedGitRepository {
  readonly pluginIds: readonly PluginId[];
  readonly payloadFiles: readonly string[];
}

export interface GeneratedMisleadingExecutableRepository extends GeneratedGitRepository {
  readonly misleadingExecutableFile: string;
  readonly misleadingExecutableRepositoryPath: ReleaseRelativePath;
  readonly misleadingPackageFile: string;
  readonly misleadingPackageRepositoryPath: ReleaseRelativePath;
  readonly misleadingAdjacentOutput: string;
}

export async function createGeneratedGitRepository(
  fixture: GitRepositoryFixtureRoot,
  pluginName = "fixture-plugin"
): Promise<GeneratedGitRepository> {
  const root = join(fixture.path, "repository");
  await mkdir(root, { mode: 0o700 });
  const pluginId = must(parsePluginId(pluginName));
  const contentAuthority = must(parseContentAuthority("fixture-authority"));
  const repositoryIdentity = must(parseRepositoryIdentity("git:fixture-agent-plugins"));
  const releaseInputPath = must(parseReleaseRelativePath(".rawr/release-input.json"));
  const pluginRoot = must(parseReleaseRelativePath("plugins/agent"));
  const payloadRelativePath = must(parseReleaseRelativePath("skills/example/SKILL.md"));
  const payloadBytes = generatedPayloadBytes(pluginName);
  const payload = must(
    createAgentPluginPayload([
      {
        path: payloadRelativePath,
        mode: 0o644,
        bytes: payloadBytes,
      },
    ])
  );
  const releaseInput = must(
    createAgentPluginReleaseInput({
      schemaVersion: 1,
      contentAuthority,
      members: [
        {
          kind: "agent-plugin",
          pluginId,
          skillInventory: [{ identity: "example", manifestPath: payloadRelativePath }],
          payload: {
            protocolVersion: 1,
            manifest: payload.manifest,
            payloadDigest: payload.payloadDigest,
          },
          vendor: [],
          curation: [],
        },
      ],
      ownershipClaims: [{ kind: "skill", identity: "example", ownerPluginId: pluginId }],
      locks: [],
      qualityPolicies: [],
    })
  );

  const rawrDirectory = join(root, ".rawr");
  const pluginDirectory = join(root, "plugins");
  const agentDirectory = join(pluginDirectory, "agent");
  const memberDirectory = join(agentDirectory, pluginId);
  const skillsDirectory = join(memberDirectory, "skills");
  const skillDirectory = join(skillsDirectory, "example");
  const releaseInputFile = join(rawrDirectory, "release-input.json");
  await mkdir(rawrDirectory, { mode: 0o700 });
  await mkdir(pluginDirectory, { mode: 0o700 });
  await mkdir(agentDirectory, { mode: 0o700 });
  await mkdir(memberDirectory, { mode: 0o700 });
  await mkdir(skillsDirectory, { mode: 0o700 });
  await mkdir(skillDirectory, { mode: 0o700 });
  const payloadFile = join(skillDirectory, "SKILL.md");
  const ignoredFile = join(memberDirectory, "ignored.txt");
  await writeFile(releaseInputFile, canonicalSerializeAgentPluginReleaseInput(releaseInput));
  await writeFile(payloadFile, payloadBytes);
  await writeFile(join(root, ".gitignore"), `/${pluginRoot}/${pluginId}/ignored.txt\n`);

  await git(root, ["init", "-b", "main"]);
  await git(root, ["config", "user.email", "fixture@example.invalid"]);
  await git(root, ["config", "user.name", "Generated Fixture"]);
  await git(root, ["config", "core.ignorecase", "false"]);
  const remoteUrl = "https://example.invalid/generated-agent-plugins.git";
  await git(root, ["remote", "add", "origin", remoteUrl]);
  await git(root, ["add", "--all"]);
  await git(root, ["commit", "-m", "fixture"]);
  const sourceCommit = must(parseGitCommitId(await git(root, ["rev-parse", "HEAD"])));
  const sourceTree = must(parseGitTreeId(await git(root, ["rev-parse", "HEAD^{tree}"])));
  return {
    root,
    pluginId,
    releaseInputFile,
    payloadFile,
    ignoredFile,
    policy: Object.freeze({
      locator: root,
      repositoryIdentity,
      contentAuthority,
      remoteName: "origin",
      remoteUrl,
      refName: "refs/heads/main",
      sourceCommit,
      sourceTree,
      releaseInputPath,
      pluginRoot,
    }),
  };
}

export async function createGeneratedMultiMemberGitRepository(
  fixture: GitRepositoryFixtureRoot
): Promise<GeneratedMultiMemberGitRepository> {
  const repository = await createGeneratedGitRepository(fixture, "fixture-alpha");
  const secondPluginId = must(parsePluginId("fixture-beta"));
  const payloadRelativePath = must(parseReleaseRelativePath("skills/example/SKILL.md"));
  const members = [repository.pluginId, secondPluginId].map((pluginId) => {
    const payload = must(
      createAgentPluginPayload([
        {
          path: payloadRelativePath,
          mode: 0o644,
          bytes: generatedPayloadBytes(pluginId),
        },
      ])
    );
    return { pluginId, payload };
  });
  const releaseInput = must(
    createAgentPluginReleaseInput({
      schemaVersion: 1,
      contentAuthority: repository.policy.contentAuthority,
      members: members.map(({ pluginId, payload }) => ({
        kind: "agent-plugin",
        pluginId,
        skillInventory: [{ identity: `${pluginId}-example`, manifestPath: payloadRelativePath }],
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
        identity: `${pluginId}-example`,
        ownerPluginId: pluginId,
      })),
      locks: [],
      qualityPolicies: [],
    })
  );

  const secondSkillDirectory = join(
    repository.root,
    ...repository.policy.pluginRoot.split("/"),
    secondPluginId,
    "skills",
    "example"
  );
  await mkdir(secondSkillDirectory, { recursive: true, mode: 0o700 });
  const secondPayloadFile = join(secondSkillDirectory, "SKILL.md");
  await writeFile(secondPayloadFile, generatedPayloadBytes(secondPluginId));
  await writeFile(
    repository.releaseInputFile,
    canonicalSerializeAgentPluginReleaseInput(releaseInput)
  );
  const policy = await commitGeneratedGitRepository(
    repository,
    "add complete multi-member release set"
  );
  return {
    ...repository,
    policy,
    pluginIds: Object.freeze([repository.pluginId, secondPluginId]),
    payloadFiles: Object.freeze([repository.payloadFile, secondPayloadFile]),
  };
}

export async function installMisleadingExecutableFiles(
  repository: GeneratedGitRepository
): Promise<GeneratedMisleadingExecutableRepository> {
  const misleadingExecutableRepositoryPath = must(
    parseReleaseRelativePath("apps/cli/src/personal-controller.mjs")
  );
  const misleadingPackageRepositoryPath = must(parseReleaseRelativePath("package.json"));
  const executableDirectory = join(repository.root, "apps", "cli", "src");
  await mkdir(executableDirectory, { recursive: true, mode: 0o700 });
  const misleadingExecutableFile = join(
    repository.root,
    ...misleadingExecutableRepositoryPath.split("/")
  );
  const misleadingPackageFile = join(repository.root, misleadingPackageRepositoryPath);
  const misleadingAdjacentOutput = join(executableDirectory, "personal-controller-ran.txt");
  await writeFile(
    misleadingExecutableFile,
    [
      "#!/usr/bin/env node",
      'import { writeFileSync } from "node:fs";',
      'writeFileSync(new URL("./personal-controller-ran.txt", import.meta.url), "executed\\n");',
      "",
    ].join("\n"),
    { mode: 0o755 }
  );
  await writeFile(
    misleadingPackageFile,
    `${JSON.stringify({
      name: "personal-content-executable-lookalike",
      private: true,
      type: "module",
      bin: { rawr: `./${misleadingExecutableRepositoryPath}` },
      scripts: { postinstall: `node ./${misleadingExecutableRepositoryPath}` },
    })}\n`
  );
  const policy = await commitGeneratedGitRepository(
    repository,
    "add misleading personal executable files"
  );
  return {
    ...repository,
    policy,
    misleadingExecutableFile,
    misleadingExecutableRepositoryPath,
    misleadingPackageFile,
    misleadingPackageRepositoryPath,
    misleadingAdjacentOutput,
  };
}

export async function commitGeneratedGitRepository(
  repository: GeneratedGitRepository,
  message: string
): Promise<ContentWorkspacePolicy> {
  await git(repository.root, ["add", "--all"]);
  await git(repository.root, ["commit", "-m", message]);
  const sourceCommit = must(parseGitCommitId(await git(repository.root, ["rev-parse", "HEAD"])));
  const sourceTree = must(parseGitTreeId(await git(repository.root, ["rev-parse", "HEAD^{tree}"])));
  return Object.freeze({ ...repository.policy, sourceCommit, sourceTree });
}

export async function installCaseCollisionCommit(
  repository: GeneratedGitRepository
): Promise<ContentWorkspacePolicy> {
  const blob = await git(repository.root, [
    "rev-parse",
    `HEAD:${repository.policy.releaseInputPath}`,
  ]);
  await git(repository.root, ["update-index", "--add", "--cacheinfo", `100644,${blob},Case.txt`]);
  await git(repository.root, ["update-index", "--add", "--cacheinfo", `100644,${blob},case.txt`]);
  const sourceTree = must(parseGitTreeId(await git(repository.root, ["write-tree"])));
  const parent = await git(repository.root, ["rev-parse", "HEAD"]);
  const sourceCommit = must(
    parseGitCommitId(
      await git(repository.root, ["commit-tree", sourceTree, "-p", parent, "-m", "case collision"])
    )
  );
  await git(repository.root, ["update-ref", "refs/heads/main", sourceCommit]);
  return Object.freeze({ ...repository.policy, sourceCommit, sourceTree });
}

export async function git(cwd: string, args: readonly string[]): Promise<string> {
  const result = await execFileAsync(GIT_EXECUTABLE, [...args], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_SYSTEM: "/dev/null",
    },
    maxBuffer: 16 * 1024 * 1024,
  });
  return result.stdout.trim();
}

function must<T, E>(
  result:
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly issues: readonly E[] }
): T {
  if (!result.ok)
    throw new Error(`generated fixture construction failed: ${JSON.stringify(result.issues)}`);
  return result.value;
}

function generatedPayloadBytes(pluginName: string): Uint8Array {
  return new TextEncoder().encode(`# Generated ${pluginName}\n`);
}

export function unsafeFixturePolicy(
  input: { locator?: string; remoteName?: string; refName?: string; releaseInputPath?: string } = {}
): ContentWorkspacePolicy {
  return {
    locator: input.locator ?? "/tmp/generated-policy-only",
    repositoryIdentity: "git:fixture-agent-plugins" as RepositoryIdentity,
    contentAuthority: "fixture-authority" as ContentAuthority,
    remoteName: input.remoteName ?? "origin",
    remoteUrl: "https://example.invalid/generated-agent-plugins.git",
    refName: input.refName ?? "refs/heads/main",
    sourceCommit: "0".repeat(40) as GitCommitId,
    sourceTree: "1".repeat(40) as GitTreeId,
    releaseInputPath: (input.releaseInputPath ?? ".rawr/release-input.json") as ReleaseRelativePath,
    pluginRoot: "plugins/agent" as ReleaseRelativePath,
  };
}
