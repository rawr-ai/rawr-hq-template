import { describe, expect, test } from "vitest";

import type { JsonObject } from "../../fluree-client";
import type { GitRunner } from "../../git";
import {
  changeNode,
  HISTORY_INTAKE_VERSION,
  type HistoryIntakePlan,
  intakeHistory,
  parseNumstat,
  parseRawDiff,
  planHistoryIntake,
} from "../../history";
import { inquiryIri } from "../../namespaces";
import { BLOB_SHA, definitionFixture, PARENT_SHA, SHA } from "./fixture";

const zero = "0".repeat(40);
const PINNED_SHA = "fedcba9876543210fedcba9876543210fedcba98";

function plannerGit(
  refTarget = SHA,
  commits: readonly string[] = [refTarget],
  onLogInput?: (input: string | Uint8Array | undefined) => void
): GitRunner {
  return {
    root: "/repo",
    text(args, options) {
      if (args[0] === "for-each-ref") {
        return [
          `refs/heads/main\t${refTarget}\tcommit\t\t`,
          `refs/codex/checkpoint\t${PARENT_SHA}\tcommit\t\t`,
          "",
        ].join("\n");
      }
      if (args[0] === "cat-file" && args[1] === "-e") return "";
      if (args[0] === "log") {
        onLogInput?.(options?.input);
        return commits
          .map((commit) =>
            [
              `\x1e${commit}`,
              "",
              "Example Author",
              "author@example.test",
              "2026-07-30T10:00:00Z",
              "Example Committer",
              "committer@example.test",
              "2026-07-30T10:01:00Z",
              "Initial evidence",
              "Initial evidence\n",
            ].join("\0")
          )
          .join("");
      }
      throw new Error(`Unexpected Git command: ${args.join(" ")}`);
    },
    bytes() {
      throw new Error("Planner should not read diffs");
    },
  };
}

function intakeGit(): GitRunner {
  return {
    root: "/repo",
    text() {
      throw new Error("A supplied plan should avoid text Git commands");
    },
    bytes(args) {
      if (args.includes("--raw")) {
        return Buffer.from(`:000000 100644 ${zero} ${BLOB_SHA} A\0src/example.ts\0`);
      }
      if (args.includes("--numstat")) {
        return Buffer.from("2\t0\tsrc/example.ts\0");
      }
      throw new Error(`Unexpected Git command: ${args.join(" ")}`);
    },
  };
}

function isNodeArray(value: JsonObject | readonly JsonObject[]): value is readonly JsonObject[] {
  return Array.isArray(value);
}

function nodes(value: JsonObject | readonly JsonObject[]): readonly JsonObject[] {
  return isNodeArray(value) ? value : [value];
}

function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

describe("Git history generation", () => {
  test("parses exact raw and numstat evidence", () => {
    expect(
      parseRawDiff(Buffer.from(`:100644 100755 ${PARENT_SHA} ${BLOB_SHA} R090\0old.ts\0new.ts\0`))
    ).toEqual([
      {
        status: "R",
        similarity: 90,
        oldPath: "old.ts",
        path: "new.ts",
        oldMode: "100644",
        newMode: "100755",
        oldBlob: PARENT_SHA,
        newBlob: BLOB_SHA,
      },
    ]);
    expect(parseNumstat(Buffer.from("2\t1\tnew.ts\0-\t-\tasset.bin\0"))).toEqual(
      new Map([
        ["new.ts", { additions: 2, deletions: 1, binary: false }],
        ["asset.bin", { binary: true }],
      ])
    );
  });

  test("plans every ref while selecting only policy-admitted history", () => {
    const plan = planHistoryIntake({
      definition: definitionFixture,
      root: "/repo",
      git: plannerGit(),
    });
    const repeated = planHistoryIntake({
      definition: definitionFixture,
      root: "/repo",
      git: plannerGit(),
    });
    const changed = planHistoryIntake({
      definition: definitionFixture,
      root: "/repo",
      git: plannerGit(PARENT_SHA),
    });

    expect(plan.refs).toHaveLength(2);
    expect(plan.includedRefs.map((ref) => ref.name)).toEqual(["refs/heads/main"]);
    expect(plan.excludedRefs).toEqual([
      expect.objectContaining({
        name: "refs/codex/checkpoint",
        reason: "excluded",
        refClass: "refs/codex/",
      }),
    ]);
    expect(plan.commits.map((commit) => commit.sha)).toEqual([SHA]);
    expect(plan.generationIri).toBe(repeated.generationIri);
    expect(plan.generationIri).not.toBe(changed.generationIri);
  });

  test("retains explicitly pinned evidence without admitting its ref", () => {
    const definition = {
      ...definitionFixture,
      repository: {
        ...definitionFixture.repository,
        pins: [PINNED_SHA],
      },
    };
    let logInput: string | Uint8Array | undefined;
    const plan = planHistoryIntake({
      definition,
      root: "/repo",
      git: plannerGit(SHA, [PINNED_SHA, SHA], (input) => {
        logInput = input;
      }),
    });

    expect(logInput).toBe(`${SHA}\n${PINNED_SHA}\n`);
    expect(plan.pinnedRoots).toEqual([PINNED_SHA]);
    expect(plan.includedRefs.map((ref) => ref.name)).toEqual(["refs/heads/main"]);
    expect(plan.excludedRefs.map((ref) => ref.name)).toEqual(["refs/codex/checkpoint"]);
    expect(plan.commits.map((commit) => commit.sha)).toEqual([PINNED_SHA, SHA]);
    expect(plan.corpusHash).not.toBe(
      planHistoryIntake({
        definition: definitionFixture,
        root: "/repo",
        git: plannerGit(),
      }).corpusHash
    );
    expect(
      planHistoryIntake({
        definition: {
          ...definitionFixture,
          repository: {
            ...definitionFixture.repository,
            pins: [SHA],
          },
        },
        root: "/repo",
        git: plannerGit(),
      }).corpusHash
    ).not.toBe(
      planHistoryIntake({
        definition: definitionFixture,
        root: "/repo",
        git: plannerGit(),
      }).corpusHash
    );
  });

  test("rejects a pin that is not a local commit", () => {
    const git = plannerGit();
    let catFileArgs: readonly string[] | undefined;
    const missingCommitGit: GitRunner = {
      ...git,
      text(args, options) {
        if (args[0] === "cat-file" && args[1] === "-e") {
          catFileArgs = args;
          throw new Error("not a commit");
        }
        return git.text(args, options);
      },
    };

    expect(() =>
      planHistoryIntake({
        definition: {
          ...definitionFixture,
          repository: {
            ...definitionFixture.repository,
            pins: [PINNED_SHA],
          },
        },
        root: "/repo",
        git: missingCommitGit,
      })
    ).toThrow(/not a commit/u);
    expect(catFileArgs).toEqual(["cat-file", "-e", `${PINNED_SHA}^{commit}`]);
  });

  test("writes commit completion after changes and generation completion last", async () => {
    const plan = planHistoryIntake({
      definition: definitionFixture,
      root: "/repo",
      git: plannerGit(),
    });
    const writes: JsonObject[][] = [];
    let queries = 0;
    const client = {
      ledger: definitionFixture.ledger,
      async query() {
        queries += 1;
        return [];
      },
      async insert(value: JsonObject | readonly JsonObject[]) {
        writes.push([...nodes(value)]);
        return {};
      },
    };

    const report = await intakeHistory({
      definition: definitionFixture,
      client,
      root: "/repo",
      git: intakeGit(),
      plan,
      chunkSize: 100,
    });

    const flattened = writes.flat();
    const commitIndex = flattened.findIndex((node) => node["@type"] === "git:Commit");
    const changeIndex = flattened.findIndex((node) => node["@type"] === "git:Change");
    const commitMarkerIndex = flattened.findIndex((node) => node["@type"] === "git:CommitIntake");
    const generationIndex = flattened.findIndex(
      (node) => node["@type"] === "git:HistoryGeneration"
    );

    expect(queries).toBe(2);
    expect(report).toEqual(
      expect.objectContaining({
        intakeVersion: HISTORY_INTAKE_VERSION,
        ingestedCommits: 1,
        parentRelativeChanges: 1,
        alreadyComplete: false,
        pinnedRoots: [],
      })
    );
    expect(flattened[commitIndex]["@id"]).toBe(inquiryIri(definitionFixture, "git:commit", SHA));
    expect(changeIndex).toBeGreaterThan(commitIndex);
    expect(commitMarkerIndex).toBeGreaterThan(changeIndex);
    expect(generationIndex).toBe(flattened.length - 1);
    expect(flattened[commitMarkerIndex]["git:complete"]).toBe(true);
    expect(flattened[generationIndex]).toEqual(
      expect.objectContaining({
        "@id": plan.generationIri,
        "git:intakeVersion": HISTORY_INTAKE_VERSION,
        "git:complete": true,
      })
    );
  });

  test("batches small Git commits into bounded Fluree transactions", async () => {
    const commits = [PARENT_SHA, SHA];
    const plan = planHistoryIntake({
      definition: definitionFixture,
      root: "/repo",
      git: plannerGit(SHA, commits),
    });
    const writes: JsonObject[][] = [];
    const progress: string[] = [];

    await intakeHistory({
      definition: definitionFixture,
      client: {
        ledger: definitionFixture.ledger,
        async query() {
          return [];
        },
        async insert(value: JsonObject | readonly JsonObject[]) {
          writes.push([...nodes(value)]);
          return {};
        },
      },
      root: "/repo",
      git: intakeGit(),
      plan,
      chunkSize: 100,
      onCommit(commit) {
        progress.push(commit.sha);
      },
    });

    expect(writes[0]?.filter((node) => node["@type"] === "git:CommitIntake")).toHaveLength(2);
    expect(progress).toEqual(commits);
  });

  test("uses the same completion evidence across overlapping retries", async () => {
    const plan = planHistoryIntake({
      definition: definitionFixture,
      root: "/repo",
      git: plannerGit(),
    });
    const completions: JsonObject[] = [];
    const run = () =>
      intakeHistory({
        definition: definitionFixture,
        root: "/repo",
        git: intakeGit(),
        plan,
        client: {
          ledger: definitionFixture.ledger,
          async query() {
            return [];
          },
          async insert(value: JsonObject | readonly JsonObject[]) {
            const completion = nodes(value).find(
              (node) => node["@type"] === "git:HistoryGeneration"
            );
            if (completion !== undefined) completions.push(completion);
            await Promise.resolve();
            return {};
          },
        },
      });

    await Promise.all([run(), run()]);

    expect(completions).toHaveLength(2);
    expect(completions[0]).toEqual(completions[1]);
  });

  test("keeps canonical commit and change identity across generations", () => {
    const first = planHistoryIntake({
      definition: definitionFixture,
      root: "/repo",
      git: plannerGit(),
    });
    const second: HistoryIntakePlan = {
      ...first,
      generationKey: "different-generation",
      generationIri: inquiryIri(
        definitionFixture,
        "git:history-generation",
        "different-generation"
      ),
    };
    const input = {
      commit: SHA,
      index: 0,
      change: {
        status: "M",
        path: "src/example.ts",
        oldMode: "100644",
        newMode: "100644",
        oldBlob: PARENT_SHA,
        newBlob: BLOB_SHA,
      },
    };
    const firstChange = changeNode(definitionFixture, input);
    const secondChange = changeNode(definitionFixture, input);

    expect(first.generationIri).not.toBe(second.generationIri);
    expect(firstChange["@id"]).toBe(secondChange["@id"]);
    expect(firstChange["git:changeSet"]).toEqual(secondChange["git:changeSet"]);
    expect(firstChange["git:commit"]).toEqual(secondChange["git:commit"]);
    expect(firstChange["git:commit"]).toEqual({
      "@id": inquiryIri(definitionFixture, "git:commit", SHA),
    });
  });

  test("reuses canonical commit evidence in an incremental generation", async () => {
    const firstPlan = planHistoryIntake({
      definition: definitionFixture,
      root: "/repo",
      git: plannerGit(),
    });
    const secondPlan = planHistoryIntake({
      definition: definitionFixture,
      root: "/repo",
      git: plannerGit(PINNED_SHA, [SHA, PINNED_SHA]),
    });
    const completedGenerations = new Set<string>();
    const completedCommits = new Set<string>();
    const writes: JsonObject[][] = [];
    const client = {
      ledger: definitionFixture.ledger,
      async query(query: JsonObject) {
        const select = query.select;
        if (Array.isArray(select) && select.includes("?complete")) {
          const where = query.where;
          if (isJsonObject(where) && typeof where["@id"] === "string") {
            return completedGenerations.has(where["@id"]) ? [[true]] : [];
          }
        }
        return [...completedCommits].map((sha) => [sha]);
      },
      async insert(value: JsonObject | readonly JsonObject[]) {
        const inserted = [...nodes(value)];
        writes.push(inserted);
        for (const node of inserted) {
          if (node["@type"] === "git:CommitIntake") {
            const commit = node["git:commit"];
            if (isJsonObject(commit) && typeof commit["@id"] === "string") {
              const sha = commit["@id"].split("/").at(-1);
              if (sha !== undefined) completedCommits.add(sha);
            }
          }
          if (node["@type"] === "git:HistoryGeneration" && typeof node["@id"] === "string") {
            completedGenerations.add(node["@id"]);
          }
        }
        return {};
      },
    };

    await intakeHistory({
      definition: definitionFixture,
      client,
      root: "/repo",
      git: intakeGit(),
      plan: firstPlan,
    });

    const diffCommits: string[] = [];
    const git = intakeGit();
    const secondGit: GitRunner = {
      ...git,
      bytes(args) {
        diffCommits.push(args.at(-1) ?? "");
        return git.bytes(args);
      },
    };
    const secondWriteOffset = writes.length;
    const report = await intakeHistory({
      definition: definitionFixture,
      client,
      root: "/repo",
      git: secondGit,
      plan: secondPlan,
    });
    const secondWrites = writes.slice(secondWriteOffset);
    const flattened = secondWrites.flat();
    const reusedMembershipIndex = secondWrites.findIndex(
      (batch) =>
        batch.length === 1 &&
        batch[0]["@id"] === inquiryIri(definitionFixture, "git:commit", SHA) &&
        batch[0]["git:observedIn"] !== undefined
    );
    const refIndex = secondWrites.findIndex((batch) =>
      batch.some((node) => node["@type"] === "git:Ref")
    );
    const generationIndex = flattened.findIndex(
      (node) => node["@type"] === "git:HistoryGeneration"
    );

    expect(report).toEqual(
      expect.objectContaining({
        existingCommits: 1,
        ingestedCommits: 1,
        parentRelativeChanges: 1,
      })
    );
    expect(diffCommits).toEqual([PINNED_SHA, PINNED_SHA]);
    expect(reusedMembershipIndex).toBeGreaterThanOrEqual(0);
    expect(secondWrites[reusedMembershipIndex]).toEqual([
      {
        "@id": inquiryIri(definitionFixture, "git:commit", SHA),
        "git:observedIn": { "@id": secondPlan.generationIri },
      },
    ]);
    expect(refIndex).toBeGreaterThan(reusedMembershipIndex);
    expect(generationIndex).toBe(flattened.length - 1);
  });

  test("does not rewrite an already complete generation", async () => {
    const plan = planHistoryIntake({
      definition: definitionFixture,
      root: "/repo",
      git: plannerGit(),
    });
    let writes = 0;
    const report = await intakeHistory({
      definition: definitionFixture,
      root: "/repo",
      git: intakeGit(),
      plan,
      client: {
        ledger: definitionFixture.ledger,
        async query() {
          return [[true]];
        },
        async insert() {
          writes += 1;
          return {};
        },
      },
    });

    expect(writes).toBe(0);
    expect(report.alreadyComplete).toBe(true);
  });

  test("records explicit pins in the completed generation and report", async () => {
    const definition = {
      ...definitionFixture,
      repository: {
        ...definitionFixture.repository,
        pins: [PINNED_SHA],
      },
    };
    const plan = planHistoryIntake({
      definition,
      root: "/repo",
      git: plannerGit(SHA, [PINNED_SHA, SHA]),
    });
    const writes: JsonObject[][] = [];
    const report = await intakeHistory({
      definition,
      client: {
        ledger: definition.ledger,
        async query() {
          return [];
        },
        async insert(value: JsonObject | readonly JsonObject[]) {
          writes.push([...nodes(value)]);
          return {};
        },
      },
      root: "/repo",
      git: intakeGit(),
      plan,
    });

    const generation = writes.flat().find((node) => node["@type"] === "git:HistoryGeneration");
    expect(generation).toEqual(
      expect.objectContaining({
        "git:pinnedRootCount": 1,
        "git:pinnedRoot": [{ "@id": inquiryIri(definition, "git:commit", PINNED_SHA) }],
      })
    );
    expect(report.pinnedRoots).toEqual([PINNED_SHA]);
  });

  test("rejects a supplied plan whose pins no longer match its definition", async () => {
    const pinnedDefinition = {
      ...definitionFixture,
      repository: {
        ...definitionFixture.repository,
        pins: [PINNED_SHA],
      },
    };
    const pinnedPlan = planHistoryIntake({
      definition: pinnedDefinition,
      root: "/repo",
      git: plannerGit(SHA, [PINNED_SHA, SHA]),
    });

    await expect(
      intakeHistory({
        definition: definitionFixture,
        client: {
          ledger: definitionFixture.ledger,
          async query() {
            return [];
          },
          async insert() {
            return {};
          },
        },
        root: "/repo",
        git: intakeGit(),
        plan: pinnedPlan,
      })
    ).rejects.toThrow(/History plan does not belong/u);
  });
});
