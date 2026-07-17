import { chmod, copyFile, mkdtemp, readFile, realpath, rmdir, symlink, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import type { HostedApprovalSelector } from "@rawr/resource-hosted-governance";

import {
  makeGithubCliHostedGovernanceResource,
  runNodeHostedGovernance,
} from "../index";

const REVISION = "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const FIXTURE_SOURCE = fileURLToPath(new URL("./fixtures/fake-gh.sh", import.meta.url));
const fixtureRoots: string[] = [];

afterEach(async () => {
  for (const root of fixtureRoots.splice(0)) {
    await unlink(path.join(root, "argv.log")).catch(() => undefined);
    await unlink(path.join(root, "gh-alias")).catch(() => undefined);
    await unlink(path.join(root, "fake-gh")).catch(() => undefined);
    await rmdir(root);
  }
});

describe("GitHub CLI Effect Platform hosted-governance provider", () => {
  it("is cold and reports an unavailable explicit executable only when observed", async () => {
    const executable = path.join(tmpdir(), "rawr-hosted-governance-missing", "gh");
    const resource = makeGithubCliHostedGovernanceResource({ githubExecutable: executable });

    expect(resource).toHaveProperty("observeApprovalHistory");
    const result = await runNodeHostedGovernance(resource.observeApprovalHistory(selector(42)));

    expectFailure(result, "Unavailable");
  });

  it("executes one exact read-only argv and schema-decodes mechanical review observations", async () => {
    const fixture = await createFixtureExecutable();
    const resource = makeGithubCliHostedGovernanceResource({ githubExecutable: fixture.executable });

    const result = await runNodeHostedGovernance(resource.observeApprovalHistory(selector(42)));

    expect(result).toEqual({
      ok: true,
      value: {
        provider: "github",
        selector: selector(42),
        observations: [
          {
            recordId: 9001,
            state: "APPROVED",
            revision: REVISION,
            actorIdentity: "repository-owner",
          },
          {
            recordId: 9002,
            state: "CHANGES_REQUESTED",
            revision: "ffffffffffffffffffffffffffffffffffffffff",
            actorIdentity: "repository-owner",
          },
          {
            recordId: 9003,
            state: "COMMENTED",
            revision: REVISION,
            actorIdentity: "review-observer",
          },
        ],
      },
    });
    const argv = (await readFile(fixture.log, "utf8")).trim().split("\n");
    expect(argv).toEqual(apiArgs(42));
    expect(argv).not.toContain("POST");
    expect(argv).not.toContain("PATCH");
    expect(argv).not.toContain("PUT");
    expect(argv).not.toContain("DELETE");
  });

  it.each([
    [43, "MalformedResponse"],
    [45, "MalformedResponse"],
    [46, "MalformedResponse"],
  ] satisfies ReadonlyArray<readonly [number, string]>)
  ("fails closed for malformed GitHub response fixture %s", async (pullRequest, reason) => {
    const fixture = await createFixtureExecutable();
    const resource = makeGithubCliHostedGovernanceResource({ githubExecutable: fixture.executable });

    const result = await runNodeHostedGovernance(
      resource.observeApprovalHistory(selector(pullRequest)),
    );

    expectFailure(result, reason);
  });

  it("returns a typed command failure without retrying or changing the request", async () => {
    const fixture = await createFixtureExecutable();
    const resource = makeGithubCliHostedGovernanceResource({ githubExecutable: fixture.executable });

    const result = await runNodeHostedGovernance(resource.observeApprovalHistory(selector(44)));

    expectFailure(result, "CommandFailed");
    expect((await readFile(fixture.log, "utf8")).trim().split("\n")).toEqual(apiArgs(44));
  });

  it("refuses a non-explicit executable before any hosted operation", async () => {
    const resource = makeGithubCliHostedGovernanceResource({ githubExecutable: "gh" });

    const result = await runNodeHostedGovernance(resource.observeApprovalHistory(selector(42)));

    expectFailure(result, "Refused");
  });

  it("refuses an aliased executable instead of changing controller identity", async () => {
    const fixture = await createFixtureExecutable();
    const alias = path.join(path.dirname(fixture.executable), "gh-alias");
    await symlink(fixture.executable, alias);
    const resource = makeGithubCliHostedGovernanceResource({ githubExecutable: alias });

    const result = await runNodeHostedGovernance(resource.observeApprovalHistory(selector(42)));

    expectFailure(result, "Refused");
    await expect(readFile(fixture.log, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  it.each([
    ["non-GitHub repository", { ...selector(42), repositoryIdentity: "git:gitlab.com/example/personal-rawr-hq" }],
    ["noncanonical revision", { ...selector(42), revision: "HEAD" }],
    ["invalid pull request", { ...selector(42), pullRequest: 0 }],
  ] satisfies ReadonlyArray<readonly [string, HostedApprovalSelector]>)
  ("refuses %s without invoking the explicit executable", async (_label, input) => {
    const fixture = await createFixtureExecutable();
    const resource = makeGithubCliHostedGovernanceResource({ githubExecutable: fixture.executable });

    const result = await runNodeHostedGovernance(resource.observeApprovalHistory(input));

    expectFailure(result, "Refused");
    await expect(readFile(fixture.log, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });
});

function selector(pullRequest: number): HostedApprovalSelector {
  return Object.freeze({
    provider: "github",
    repositoryIdentity: "git:github.com/example/personal-rawr-hq",
    pullRequest,
    revision: REVISION,
  });
}

function apiArgs(pullRequest: number): readonly string[] {
  return [
    "api",
    "--hostname",
    "github.com",
    "--method",
    "GET",
    "--header",
    "Accept: application/vnd.github+json",
    "--header",
    "X-GitHub-Api-Version: 2022-11-28",
    "--paginate",
    "--slurp",
    `repos/example/personal-rawr-hq/pulls/${pullRequest}/reviews?per_page=100`,
  ];
}

async function createFixtureExecutable(): Promise<Readonly<{ executable: string; log: string }>> {
  const allocated = await mkdtemp(path.join(tmpdir(), "rawr-hosted-governance-test-"));
  const root = await realpath(allocated);
  fixtureRoots.push(root);
  const executable = path.join(root, "fake-gh");
  await copyFile(FIXTURE_SOURCE, executable);
  await chmod(executable, 0o755);
  return Object.freeze({ executable, log: path.join(root, "argv.log") });
}

function expectFailure(
  result: Awaited<ReturnType<typeof runNodeHostedGovernance>>,
  reason: string,
): void {
  expect(result).toMatchObject({
    ok: false,
    failure: {
      _tag: "HostedGovernanceFailure",
      operation: "observe-approval-history",
      reason,
    },
  });
}
