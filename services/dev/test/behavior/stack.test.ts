import { afterEach, describe, expect, it } from "vitest";
import { createFixture, type Fixture, type GraphiteProtocol } from "../support/service/fixture";

const fixtures: Fixture[] = [];
afterEach(async () => {
  for (const fixture of fixtures.splice(0)) await fixture.cleanup();
});
const state = {
  trunk: { trunk: true },
  "feature.dotted": {
    trunk: false,
    needs_restack: false,
    parents: [{ ref: "trunk", sha: "native-parent-basis" }],
  },
  unrelated: { deliberately: "ignored" },
};
async function setup(protocol: GraphiteProtocol = { state }) {
  const fixture = await createFixture(protocol);
  fixtures.push(fixture);
  fixture.git(["switch", "-c", "feature.dotted"]);
  return fixture;
}

describe("stack service orchestration against a named native-child protocol fixture", () => {
  it("reports actual dotted branch identity and selected native state without glyph or unrelated-graph inference", async () => {
    const fixture = await setup();
    const result = await fixture.client.stack.doctor({ repositoryPath: fixture.repositoryPath });
    expect(result.kind).toBe("Healthy");
    expect(result.branch).toBe("feature.dotted");
    expect(result.dirty).toBe(false);
    expect(result.stack).toEqual({
      trunk: "trunk",
      branches: [{ branch: "feature.dotted", parent: "trunk", needsRestack: false }],
    });
    expect(result.worktrees).toHaveLength(1);
    expect(fixture.calls.filter((call) => call.command === "gt").map((call) => call.args)).toEqual([
      ["state", "--no-interactive"],
    ]);
  });

  it("does not mutate when planning and requests exactly submit then merge when admitted", async () => {
    const fixture = await setup();
    const planned = await fixture.client.stack.drain({ repositoryPath: fixture.repositoryPath });
    expect(planned.kind).toBe("Planned");
    expect(planned.steps.slice(-2).map((step) => step.status)).toEqual(["planned", "planned"]);
    expect(fixture.calls.some((call) => call.args[0] === "submit")).toBe(false);
    fixture.calls.length = 0;
    const requested = await fixture.client.stack.drain({
      repositoryPath: fixture.repositoryPath,
      apply: true,
    });
    expect(requested.kind).toBe("Requested");
    expect(requested.steps.at(-1)?.stdout).toBe("Merge job started\n");
    expect(fixture.calls.filter((call) => call.command === "gt").map((call) => call.args)).toEqual([
      ["state", "--no-interactive"],
      ["submit", "--publish", "--no-stack", "--no-ai", "--no-edit", "--no-interactive"],
      ["merge", "--no-interactive"],
    ]);
    expect(requested).not.toHaveProperty("converged");
    expect(requested).not.toHaveProperty("cycles");
  });

  it("stops after submit failure and preserves the unattempted merge suffix", async () => {
    const fixture = await setup({ state, submitExit: 7 });
    const result = await fixture.client.stack.drain({
      repositoryPath: fixture.repositoryPath,
      apply: true,
    });
    expect(result.kind).toBe("Failed");
    expect(result.steps.slice(-2).map((step) => step.status)).toEqual(["failed", "skipped"]);
    expect(result.steps.at(-2)?.exitCode).toBe(7);
    expect(result.steps.at(-2)?.stderr).toBe("protocol refusal\n");
    expect(fixture.calls.some((call) => call.args[0] === "merge")).toBe(false);
  });

  it("reports failed native merge requests without resubmitting or sweeping", async () => {
    const fixture = await setup({ state, mergeExit: 9 });
    const result = await fixture.client.stack.drain({
      repositoryPath: fixture.repositoryPath,
      apply: true,
    });
    expect(result.kind).toBe("Failed");
    expect(result.steps.slice(-2).map((step) => step.status)).toEqual(["succeeded", "failed"]);
    expect(result.issues.at(-1)?.code).toBe("MergeRequestFailed");
    expect(fixture.calls.filter((call) => call.args[0] === "submit")).toHaveLength(1);
    expect(fixture.calls.some((call) => call.args[0] === "sync")).toBe(false);
  });

  it.each([
    {},
    { ...state, "feature.dotted": { trunk: false, needs_restack: false, parents: [] } },
    {
      ...state,
      "feature.dotted": {
        trunk: false,
        needs_restack: false,
        parents: [{ ref: "feature.dotted", sha: "cycle" }],
      },
    },
    {
      ...state,
      "feature.dotted": {
        trunk: false,
        needs_restack: false,
        parents: [{ ref: "absent", sha: "missing" }],
      },
    },
    {
      ...state,
      "feature.dotted": {
        trunk: false,
        needs_restack: true,
        parents: [{ ref: "trunk", sha: "basis" }],
      },
    },
  ])("refuses ambiguous or non-admitted selected ancestry before submission: %j", async (nativeState) => {
    const fixture = await setup({ state: nativeState });
    const diagnosis = await fixture.client.stack.doctor({ repositoryPath: fixture.repositoryPath });
    expect(diagnosis.kind).toBe("NeedsAttention");
    const result = await fixture.client.stack.drain({
      repositoryPath: fixture.repositoryPath,
      apply: true,
    });
    expect(result.kind).toBe("Refused");
    expect(
      fixture.calls.some((call) => call.args[0] === "submit" || call.args[0] === "merge")
    ).toBe(false);
  });
});
