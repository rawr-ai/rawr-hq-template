import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createFixture, type Fixture } from "../support/service/fixture";

const fixtures: Fixture[] = [];
afterEach(async () => {
  for (const fixture of fixtures.splice(0)) await fixture.cleanup();
});
async function setup() {
  const fixture = await createFixture();
  fixtures.push(fixture);
  return fixture;
}

async function upstream(fixture: Fixture) {
  const remote = join(fixture.root, "remote.git");
  const author = join(fixture.root, "author");
  fixture.git(["clone", "--bare", fixture.repositoryPath, remote], fixture.root);
  fixture.git(["remote", "add", "origin", remote]);
  fixture.git(["fetch", "origin"]);
  fixture.git(["branch", "--set-upstream-to=origin/trunk", "trunk"]);
  fixture.git(["clone", remote, author], fixture.root);
  await writeFile(join(author, "file.txt"), "remote update\n");
  fixture.git(["add", "."], author);
  fixture.git(["commit", "-m", "remote update"], author);
  fixture.git(["push", "origin", "trunk"], author);
  return { remote, author, target: fixture.git(["rev-parse", "HEAD"], author).trim() };
}

describe("native Git fast-forward update", () => {
  it("plans without fetching, resolves nested locators, then applies configured upstream and converges", async () => {
    const fixture = await setup();
    const source = await upstream(fixture);
    const before = fixture.git(["rev-parse", "HEAD"]).trim();
    const nested = join(fixture.repositoryPath, "nested");
    await mkdir(nested);
    const planned = await fixture.client.repo.syncUpstream({ repositoryPath: nested });
    expect(planned.kind).toBe("Planned");
    expect(planned.repositoryRoot).toBe(fixture.repositoryPath);
    expect(planned.upstream).toEqual({ remote: "origin", branch: "trunk", source: "configured" });
    expect(fixture.calls.some((call) => call.args[0] === "pull")).toBe(false);
    expect(fixture.git(["rev-parse", "HEAD"]).trim()).toBe(before);
    expect(fixture.git(["rev-parse", "origin/trunk"]).trim()).toBe(before);
    const applied = await fixture.client.repo.syncUpstream({ repositoryPath: nested, apply: true });
    expect(applied.kind).toBe("Updated");
    expect(applied.before).toBe(before);
    expect(applied.after).toBe(source.target);
    expect(await readFile(join(fixture.repositoryPath, "file.txt"), "utf8")).toBe(
      "remote update\n"
    );
    const repeated = await fixture.client.repo.syncUpstream({
      repositoryPath: nested,
      apply: true,
    });
    expect(repeated.kind).toBe("Updated");
    expect(repeated.before).toBe(repeated.after);
    expect(fixture.calls.filter((call) => call.command === "gt")).toEqual([]);
    expect(fixture.git(["branch", "--format=%(refname:short)"]).trim()).toBe("trunk");
  });

  it("admits an explicit pair and refuses missing upstream, dirty and detached checkouts before pull", async () => {
    const fixture = await setup();
    const missing = await fixture.client.repo.syncUpstream({
      repositoryPath: fixture.repositoryPath,
      apply: true,
    });
    expect(missing.kind).toBe("Refused");
    expect(missing.issues.some((entry) => entry.code === "UpstreamUnavailable")).toBe(true);
    const source = await upstream(fixture);
    await writeFile(join(fixture.repositoryPath, "file.txt"), "local dirty\n");
    const dirty = await fixture.client.repo.syncUpstream({
      repositoryPath: fixture.repositoryPath,
      apply: true,
      upstream: { remote: source.remote, branch: "trunk" },
    });
    expect(dirty.kind).toBe("Refused");
    expect(dirty.issues.some((entry) => entry.code === "DirtyWorkingTree")).toBe(true);
    fixture.git(["restore", "file.txt"]);
    fixture.git(["switch", "--detach"]);
    const detached = await fixture.client.repo.syncUpstream({
      repositoryPath: fixture.repositoryPath,
      apply: true,
      upstream: { remote: source.remote, branch: "trunk" },
    });
    expect(detached.kind).toBe("Refused");
    expect(detached.branch).toBeNull();
    expect(fixture.calls.some((call) => call.args[0] === "pull")).toBe(false);
  });

  it("preserves native fast-forward refusal and the completed fetch without rewriting divergent local work", async () => {
    const fixture = await setup();
    const source = await upstream(fixture);
    await writeFile(join(fixture.repositoryPath, "local.txt"), "local commit\n");
    fixture.git(["add", "."]);
    fixture.git(["commit", "-m", "local update"]);
    const before = fixture.git(["rev-parse", "HEAD"]).trim();
    const result = await fixture.client.repo.syncUpstream({
      repositoryPath: fixture.repositoryPath,
      apply: true,
    });
    expect(result.kind).toBe("Failed");
    const pull = result.steps.find((step) => step.args[0] === "pull");
    expect(pull?.status).toBe("failed");
    expect(pull?.exitCode).not.toBe(0);
    expect(pull?.stderr).toMatch(/fast-forward|diverg/i);
    expect(result.after).toBe(before);
    expect(fixture.git(["rev-parse", "FETCH_HEAD"]).trim()).toBe(source.target);
    expect(fixture.git(["status", "--porcelain"])).toBe("");
  });

  it("uses only explicit scratch files, reports blocking during planning, and allows warning", async () => {
    const fixture = await setup();
    const source = await upstream(fixture);
    const input = {
      repositoryPath: fixture.repositoryPath,
      upstream: { remote: source.remote, branch: "trunk" },
    };
    const blocked = await fixture.client.repo.syncUpstream({
      ...input,
      scratch: { mode: "block", files: ["absent-not-personal.md"] },
    });
    expect(blocked.kind).toBe("Refused");
    expect(blocked.scratch).toEqual({
      mode: "block",
      files: [{ path: join(fixture.repositoryPath, "absent-not-personal.md"), status: "missing" }],
    });
    expect(fixture.calls.some((call) => call.args[0] === "pull")).toBe(false);
    const warning = await fixture.client.repo.syncUpstream({
      ...input,
      apply: true,
      scratch: { files: ["absent-not-personal.md"] },
    });
    expect(warning.kind).toBe("Updated");
    expect(warning.issues.find((entry) => entry.code === "ScratchFileMissing")?.severity).toBe(
      "warning"
    );
    const evidence = join(fixture.root, "arbitrary-evidence.txt");
    await writeFile(evidence, "This file is not interpreted.\n");
    const present = await fixture.client.repo.syncUpstream({
      ...input,
      scratch: { mode: "block", files: [evidence] },
    });
    expect(present.kind).toBe("Planned");
    expect(present.scratch?.files[0]?.status).toBe("present");
    const directory = await fixture.client.repo.syncUpstream({
      ...input,
      scratch: { mode: "block", files: [fixture.root] },
    });
    expect(directory.kind).toBe("Refused");
    expect(directory.scratch?.files[0]?.status).toBe("not-file");
  });
});
