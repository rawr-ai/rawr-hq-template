import { describe, expect, test } from "vitest";

import type { InquiryDefinition } from "../../definition";
import type { JsonObject, JsonValue } from "../../fluree-client";
import {
  assertFrameGenerationImmutable,
  assertFrameObservationImmutable,
  FRAME_CONTENT_IDENTITY_VERSION,
  FRAME_PARSER_VERSION,
  FRAME_RECONSTRUCTION_VERSION,
  FRAME_SCHEMA_VERSION,
  intakeFrame,
  parseFrameLedger,
  parseFrameLedgerEntries,
} from "../../frame";
import {
  FRAME_ATTESTATION_PROMPT,
  FRAME_ATTESTATION_PROMPT_VERSION,
} from "../../frame-attestation";
import type { GitRunner } from "../../git";
import {
  type GitCommit,
  HISTORY_INTAKE_VERSION,
  type HistoryIntakePlan,
  planHistoryIntake,
} from "../../history";
import { contextFor, evidenceHash, inquiryIri, namespacesFor } from "../../namespaces";
import { BLOB_SHA, definitionFixture, PARENT_SHA, SHA } from "./fixture";

const CHILD_BLOB = "2222222222222222222222222222222222222222";
const BRANCH_SHA = "3333333333333333333333333333333333333333";
const BRANCH_BLOB = "4444444444444444444444444444444444444444";
const MERGE_SHA = "5555555555555555555555555555555555555555";
const SESSION_IRI = inquiryIri(definitionFixture, "session", "session-123");
const HISTORY_GENERATION = inquiryIri(definitionFixture, "git:history-generation", "history-123");
const compactIri = (value: string) => value.replace(`${definitionFixture.namespace}id/`, "id:");

function entry(title: string, date = "2026-07-30"): string {
  return `## ${date} - ${title}

### Frame Shift
The graph joins reviewed meaning with exact evidence for ${title}.

### Selection
Select questions whose answers change under reviewed meaning.

### Authority
Git owns source and the model owns reviewed meaning.

### Boundaries
Search proposes candidates but cannot grant identity.

### Invariants
Every answer names both source and model time.

### Falsifier
Use Git when Git answers the question faithfully.

### Bags Of Keywords
- **What:** History, Meaning, Snapshot, Result.
- **How:** Ledger, Time, Graph, Authority.

### Relations
- Snapshot binds Result.
- Authority grounds Meaning.`;
}

const ledger = (...entries: readonly string[]) => `# Working Frame Ledger

This ledger records material frame changes.

${entries.join("\n\n")}
`;

const validFrame = ledger(entry("Meaning Makes History Useful"));

function commit(sha: string, parents: readonly string[], committedAt: string): GitCommit {
  return {
    sha,
    parents,
    authorName: "Frame Author",
    authorEmail: "frame@example.test",
    authoredAt: committedAt,
    committerName: "Frame Author",
    committerEmail: "frame@example.test",
    committedAt,
    subject: `Frame ${sha.slice(0, 7)}`,
    message: `Frame ${sha}`,
  };
}

function historyPlan(commits: readonly GitCommit[]): HistoryIntakePlan {
  return {
    definitionId: definitionFixture.id,
    ledger: definitionFixture.ledger,
    namespace: definitionFixture.namespace,
    intakeVersion: HISTORY_INTAKE_VERSION,
    refPolicyVersion: definitionFixture.repository.refPolicy.version,
    refs: [],
    includedRefs: [],
    excludedRefs: [],
    pinnedRoots: [],
    commits,
    corpusHash: "corpus-123",
    generationKey: "history-123",
    generationIri: HISTORY_GENERATION,
  };
}

function frameGit(options: {
  readonly blobs: Readonly<Record<string, string | undefined>>;
  readonly commits: readonly GitCommit[];
  readonly contents: Readonly<Record<string, string>>;
}): GitRunner {
  return {
    root: "/repo",
    text(args) {
      if (args[0] === "rev-parse" && args[1]?.endsWith("^{commit}")) {
        return `${args[1].slice(0, -"^{commit}".length)}\n`;
      }
      if (args[0] === "rev-parse" && args[1] === "--verify") {
        const commitSha = args[2]?.split(":", 1)[0] ?? "";
        const blob = options.blobs[commitSha];
        if (blob === undefined) throw new Error("path absent");
        return `${blob}\n`;
      }
      if (args[0] === "log") {
        return options.commits
          .map(
            (candidate) =>
              `\x1e${candidate.sha}\x00${candidate.parents.join(" ")}\x00${candidate.committedAt}\n`
          )
          .join("");
      }
      throw new Error(`Unexpected Git text command: ${args.join(" ")}`);
    },
    bytes(args) {
      if (args[0] !== "show") throw new Error(`Unexpected Git bytes command: ${args.join(" ")}`);
      const commitSha = args[1]?.split(":", 1)[0] ?? "";
      const content = options.contents[commitSha];
      if (content === undefined) throw new Error("path absent");
      return new TextEncoder().encode(content);
    },
  };
}

function frameClient(
  plan: HistoryIntakePlan,
  writes: JsonObject[][],
  session?: { readonly generation: string; readonly source: string },
  changedCommits: readonly string[] = plan.commits.map((candidate) => candidate.sha),
  initialNodes: readonly JsonObject[] = []
) {
  const stored = new Map<string, JsonObject>();
  const transactions: JsonObject[] = [];
  const context = contextFor(definitionFixture);
  const expand = (node: JsonObject): JsonObject => {
    const expanded: Record<string, JsonValue | undefined> = { "@id": node["@id"] };
    const term = (value: string) => {
      if (value === "@fulltext") return `${namespacesFor(definitionFixture).f}fullText`;
      const separator = value.indexOf(":");
      const namespace = separator < 1 ? undefined : context[value.slice(0, separator)];
      return namespace === undefined ? value : `${namespace}${value.slice(separator + 1)}`;
    };
    const value = (entry: JsonValue | undefined): JsonValue | undefined => {
      if (Array.isArray(entry)) return entry.map((item) => value(item) as JsonValue);
      if (entry === null || typeof entry !== "object") return entry;
      const record = entry as JsonObject;
      if (typeof record["@id"] === "string") return { "@id": term(record["@id"]) };
      return {
        ...record,
        ...(typeof record["@type"] === "string" ? { "@type": term(record["@type"]) } : {}),
      };
    };
    for (const [predicate, raw] of Object.entries(node)) {
      if (predicate === "@id") continue;
      if (Array.isArray(raw) && raw.length === 0) continue;
      if (predicate === "@type") {
        expanded["@type"] = (Array.isArray(raw) ? raw : [raw]).map((entry) => term(String(entry)));
      } else {
        expanded[term(predicate)] = value(raw);
      }
    }
    return expanded;
  };
  for (const node of initialNodes) stored.set(String(node["@id"]), expand(node));
  return {
    ledger: definitionFixture.ledger,
    async query(body: JsonObject) {
      if (
        Array.isArray(body.select) &&
        body.select.length > 0 &&
        body.select.every(
          (selection) =>
            selection !== null && typeof selection === "object" && !Array.isArray(selection)
        )
      ) {
        const expansions = body.select.map((selection) => {
          const subject = Object.keys(selection as JsonObject)[0];
          return stored.get(subject) ?? { "@id": subject };
        });
        return expansions.length === 1 ? expansions : [expansions];
      }
      if (body.from === `${definitionFixture.ledger}#txn-meta`) {
        const job = (body.where as JsonObject)?.["meta:job"];
        return transactions
          .filter((transaction) => transaction["meta:job"] === job)
          .map((transaction, index) => [`fluree:commit:${String(index + 1)}`, index + 1]);
      }
      if (JSON.stringify(body.where).includes("session:Generation")) {
        return session === undefined
          ? []
          : [
              [
                compactIri(SESSION_IRI),
                session.source,
                compactIri(
                  inquiryIri(definitionFixture, "git:commit", plan.commits.at(-1)?.sha ?? SHA)
                ),
              ],
            ];
      }
      if (JSON.stringify(body.where).includes("git:Change")) {
        return changedCommits.map((sha) => [sha]);
      }
      return plan.commits.map((candidate) => [candidate.sha]);
    },
    async insert(nodes: JsonObject | readonly JsonObject[], options?: { metadata?: JsonObject }) {
      const written = Array.isArray(nodes) ? [...nodes] : [nodes as JsonObject];
      writes.push(written);
      for (const node of written) stored.set(String(node["@id"]), expand(node));
      if (options?.metadata !== undefined) transactions.push(options.metadata);
      return {};
    },
  };
}

function rootPlan(): HistoryIntakePlan {
  return historyPlan([commit(SHA, [], "2026-07-30T10:00:00Z")]);
}

describe("working frame lineage", () => {
  test("ships the authoring contract that matches the strict parser", () => {
    expect(FRAME_ATTESTATION_PROMPT_VERSION).toBe(1);
    expect(FRAME_PARSER_VERSION).toBe("frame-parser-v3");
    expect(FRAME_RECONSTRUCTION_VERSION).toBe("frame-reconstruction-v2");
    expect(FRAME_SCHEMA_VERSION).toBe("frame-lineage-v1");
    expect(FRAME_CONTENT_IDENTITY_VERSION).toBe("frame-content-identity-v2");
    for (const section of [
      "Frame Shift",
      "Selection",
      "Authority",
      "Boundaries",
      "Invariants",
      "Bags Of Keywords",
      "Falsifier",
    ]) {
      expect(FRAME_ATTESTATION_PROMPT).toContain(`\`${section}\``);
    }
  });

  test("parses every exact occurrence while preserving newest-entry compatibility", () => {
    const markdown = `# Working Frame Ledger

Unicode preamble: café.

${entry("Newest")}

${entry("Older", "2026-07-29")}${"   "}
`;
    const occurrences = parseFrameLedgerEntries(markdown);

    expect(occurrences).toHaveLength(2);
    expect(occurrences[0]).toMatchObject({ ordinal: 0, valid: true });
    expect(occurrences[1]).toMatchObject({ ordinal: 1, valid: true });
    expect(occurrences[0].byteStart).toBe(
      new TextEncoder().encode(markdown.split("## ")[0]).length
    );
    expect(occurrences[1].entry.endsWith("Authority grounds Meaning.")).toBe(true);
    expect(parseFrameLedger(markdown).title).toBe("Newest");
  });

  test("treats a malformed newest H2 as current instead of exposing an older entry", () => {
    const markdown = ledger("## not-a-frame\n\nMalformed.", entry("Older"));
    const occurrences = parseFrameLedgerEntries(markdown);

    expect(occurrences[0]).toMatchObject({ ordinal: 0, valid: false });
    expect(occurrences[1]).toMatchObject({ ordinal: 1, valid: true });
    expect(() => parseFrameLedger(markdown)).toThrow(/heading must be/u);
  });

  test("retains a pre-ledger frame document as one opaque historical occurrence", () => {
    const markdown = `# Questions Earn History

## Intent
Preserve the exact predecessor lens.

## Frame
Questions select evidence.
   `;
    const occurrences = parseFrameLedgerEntries(markdown);

    expect(occurrences).toEqual([
      expect.objectContaining({
        ordinal: 0,
        byteStart: 0,
        byteEnd: Buffer.byteLength(markdown.trimEnd(), "utf8"),
        entry: markdown.trimEnd(),
        valid: false,
        issues: ["No Working Frame Ledger heading found"],
      }),
    ]);
    expect(() => parseFrameLedger(markdown)).toThrow(/No Working Frame Ledger heading/u);
  });

  test("retains strict atomic bag and relation validation", () => {
    expect(() =>
      parseFrameLedger(
        validFrame.replace(
          "**What:** History, Meaning, Snapshot, Result.",
          "**What:** Git History, Meaning, Snapshot, Result."
        )
      )
    ).toThrow(/atomic alphabetic/u);
    expect(() => parseFrameLedger(validFrame.replace("**How:**", "**What:**"))).toThrow(
      /bag names must be unique/u
    );
    expect(() =>
      parseFrameLedger(validFrame.replace("- Snapshot binds Result.", "- Snapshot binds Unknown."))
    ).toThrow(/match keyword bag terms/u);
  });

  test("writes seven-class membership, a complete generation, and a separate observation", async () => {
    const plan = rootPlan();
    const writes: JsonObject[][] = [];
    const report = await intakeFrame({
      definition: definitionFixture,
      root: "/repo",
      git: frameGit({
        blobs: { [SHA]: BLOB_SHA },
        commits: plan.commits,
        contents: { [SHA]: validFrame },
      }),
      atCommit: SHA,
      historyGeneration: HISTORY_GENERATION,
      historyPlan: plan,
      client: frameClient(plan, writes),
    });
    const generationWrite = writes[0];
    const observationWrite = writes[1];
    const generationNode = generationWrite.find((node) => node["@type"] === "frame:Generation");
    const changeNode = generationWrite.find((node) => node["@type"] === "frame:Change");
    const attestationNode = generationWrite.find(
      (node) => node["@type"] === "frame:LineageAttestation"
    );
    const memberIds = new Set(
      ((generationNode?.["frame:member"] as readonly JsonObject[]) ?? []).map((node) => node["@id"])
    );
    const types = new Set(
      generationWrite
        .filter((node) => node["@type"] === "frame:Generation" || memberIds.has(node["@id"]))
        .map((node) => node["@type"])
    );

    expect(types).toEqual(
      new Set([
        "frame:Content",
        "frame:Assessment",
        "frame:LineageAttestation",
        "frame:Change",
        "frame:Bag",
        "frame:Term",
        "frame:Relation",
        "frame:Generation",
      ])
    );
    expect(observationWrite.find((node) => node["@type"] === "frame:Observation")).toMatchObject({
      "@id": report.observation,
      "@type": "frame:Observation",
      "frame:selectedAttestation": { "@id": report.attestation },
      "frame:complete": true,
    });
    expect(report).toEqual(
      expect.objectContaining({
        frame: "Meaning Makes History Useful",
        commit: SHA,
        blob: BLOB_SHA,
        observedCommit: SHA,
        sourceCommittedAt: "2026-07-30T10:00:00.000Z",
        attestedAt: "2026-07-30T10:00:00.000Z",
        assessmentCount: 1,
        changeCount: 1,
      })
    );
    expect(report.membershipCount).toBe(memberIds.size);
    expect(attestationNode?.["frame:sourceCommittedAt"]).toEqual({
      "@value": "2026-07-30T10:00:00.000000Z",
      "@type": "xsd:dateTime",
    });
    expect(changeNode?.["@id"]).toBe(
      inquiryIri(
        definitionFixture,
        "frame:change",
        evidenceHash(
          [
            FRAME_RECONSTRUCTION_VERSION,
            FRAME_PARSER_VERSION,
            SHA,
            "root",
            "absent",
            BLOB_SHA,
            "add:0",
            String(attestationNode?.["@id"]),
            "",
          ].join("\0")
        )
      )
    );
    expect(report).toMatchObject({ generationExisting: false, observationExisting: false });
  });

  test("proves generation members and observations immutable from their intake transactions", async () => {
    const frame = namespacesFor(definitionFixture).frame;
    const generation = inquiryIri(definitionFixture, "frame:generation", "immutable");
    const observation = inquiryIri(definitionFixture, "frame:observation", "immutable");
    const member = inquiryIri(definitionFixture, "frame:content", "immutable");
    let mutateMember = false;
    let mutateObservation = false;
    const client = {
      ledger: definitionFixture.ledger,
      async query(body: JsonObject) {
        if (body.from === `${definitionFixture.ledger}#txn-meta`) {
          return [["fluree:commit:intake", "1"]];
        }
        if (!Array.isArray(body.select)) return [];
        const subjects = body.select.map((selection) => Object.keys(selection as JsonObject)[0]);
        const current = body.from === definitionFixture.ledger;
        const expansions = subjects.map((subject) => {
          if (subject === generation) {
            const membershipDigest = evidenceHash(
              `${FRAME_RECONSTRUCTION_VERSION}\nframe:Content ${member}\n`
            );
            return {
              "@id": generation,
              "@type": `${frame}Generation`,
              [`${frame}member`]: { "@id": member },
              [`${frame}memberCount`]: 1,
              [`${frame}membershipDigest`]: membershipDigest,
              [`${frame}reconstructionVersion`]: FRAME_RECONSTRUCTION_VERSION,
            };
          }
          if (subject === observation) {
            return {
              "@id": observation,
              "@type": `${frame}Observation`,
              ...(current && mutateObservation ? { [`${frame}complete`]: false } : {}),
            };
          }
          return {
            "@id": member,
            "@type": `${frame}Content`,
            ...(current && mutateMember ? { [`${frame}contentHash`]: "changed" } : {}),
          };
        });
        return expansions.length === 1 ? expansions : [expansions];
      },
    };

    await expect(
      assertFrameGenerationImmutable({ client, definition: definitionFixture, generation })
    ).resolves.toBeUndefined();
    await expect(
      assertFrameObservationImmutable({ client, definition: definitionFixture, observation })
    ).resolves.toBeUndefined();
    mutateMember = true;
    await expect(
      assertFrameGenerationImmutable({ client, definition: definitionFixture, generation })
    ).rejects.toThrow(/content changed/u);
    mutateMember = false;
    mutateObservation = true;
    await expect(
      assertFrameObservationImmutable({ client, definition: definitionFixture, observation })
    ).rejects.toThrow(/changed after intake/u);
  });

  test("uses exact-suffix inheritance and right-biased duplicate alignment", async () => {
    const a = entry("A");
    const b = entry("B", "2026-07-29");
    const plan = historyPlan([
      commit(SHA, [], "2026-07-29T10:00:00Z"),
      commit(PARENT_SHA, [SHA], "2026-07-30T10:00:00Z"),
    ]);
    const writes: JsonObject[][] = [];
    const report = await intakeFrame({
      definition: definitionFixture,
      root: "/repo",
      git: frameGit({
        blobs: { [SHA]: BLOB_SHA, [PARENT_SHA]: CHILD_BLOB },
        commits: plan.commits,
        contents: { [SHA]: ledger(a, b), [PARENT_SHA]: ledger(a, a, b) },
      }),
      atCommit: PARENT_SHA,
      historyGeneration: HISTORY_GENERATION,
      historyPlan: plan,
      client: frameClient(plan, writes),
    });
    const generationWrite = writes[0];
    const attestations = generationWrite.filter(
      (node) => node["@type"] === "frame:LineageAttestation"
    );
    const childAttestations = attestations.filter(
      (node) =>
        (node["frame:source"] as JsonObject)?.["@id"] ===
        inquiryIri(definitionFixture, "git:commit", PARENT_SHA)
    );

    expect(attestations).toHaveLength(3);
    expect(childAttestations).toHaveLength(1);
    expect(childAttestations[0]["frame:entryOrdinal"]).toBe(0);
    expect(report.attestation).toBe(childAttestations[0]["@id"]);
    expect(report.commit).toBe(PARENT_SHA);
  });

  test("admits an any-parent merge change while retaining first-parent identity", async () => {
    const aFrame = ledger(entry("A"));
    const bFrame = ledger(entry("B"));
    const plan = historyPlan([
      commit(SHA, [], "2026-07-28T10:00:00Z"),
      commit(PARENT_SHA, [SHA], "2026-07-29T10:00:00Z"),
      commit(BRANCH_SHA, [SHA], "2026-07-29T11:00:00Z"),
      commit(MERGE_SHA, [PARENT_SHA, BRANCH_SHA], "2026-07-30T10:00:00Z"),
    ]);
    const writes: JsonObject[][] = [];
    const report = await intakeFrame({
      definition: definitionFixture,
      root: "/repo",
      git: frameGit({
        blobs: {
          [SHA]: BLOB_SHA,
          [PARENT_SHA]: BLOB_SHA,
          [BRANCH_SHA]: BRANCH_BLOB,
          [MERGE_SHA]: BLOB_SHA,
        },
        commits: plan.commits,
        contents: {
          [SHA]: aFrame,
          [PARENT_SHA]: aFrame,
          [BRANCH_SHA]: bFrame,
          [MERGE_SHA]: aFrame,
        },
      }),
      atCommit: MERGE_SHA,
      historyGeneration: HISTORY_GENERATION,
      historyPlan: plan,
      client: frameClient(plan, writes, undefined, [SHA, BRANCH_SHA, MERGE_SHA]),
    });
    const generationWrite = writes[0];
    const mergeChanges = generationWrite.filter(
      (node) =>
        node["@type"] === "frame:Change" &&
        (node["frame:commit"] as JsonObject)?.["@id"] ===
          inquiryIri(definitionFixture, "git:commit", MERGE_SHA)
    );
    const mergeAttestations = generationWrite.filter(
      (node) =>
        node["@type"] === "frame:LineageAttestation" &&
        (node["frame:source"] as JsonObject)?.["@id"] ===
          inquiryIri(definitionFixture, "git:commit", MERGE_SHA)
    );

    expect(mergeChanges).toHaveLength(2);
    expect(mergeAttestations).toHaveLength(0);
    expect(report.commit).toBe(SHA);
  });

  test("records mutation, deletion, and reintroduction without rewriting prior evidence", async () => {
    const a = entry("A");
    const b = entry("B", "2026-07-29");
    const changedA = entry("A Changed");
    const plan = historyPlan([
      commit(SHA, [], "2026-07-28T10:00:00Z"),
      commit(PARENT_SHA, [SHA], "2026-07-29T10:00:00Z"),
      commit(BRANCH_SHA, [PARENT_SHA], "2026-07-30T10:00:00Z"),
      commit(MERGE_SHA, [BRANCH_SHA], "2026-07-31T10:00:00Z"),
    ]);
    const writes: JsonObject[][] = [];
    const report = await intakeFrame({
      definition: definitionFixture,
      root: "/repo",
      git: frameGit({
        blobs: {
          [SHA]: BLOB_SHA,
          [PARENT_SHA]: CHILD_BLOB,
          [BRANCH_SHA]: undefined,
          [MERGE_SHA]: BLOB_SHA,
        },
        commits: plan.commits,
        contents: {
          [SHA]: ledger(a, b),
          [PARENT_SHA]: ledger(changedA, b),
          [MERGE_SHA]: ledger(a, b),
        },
      }),
      atCommit: MERGE_SHA,
      historyGeneration: HISTORY_GENERATION,
      historyPlan: plan,
      client: frameClient(plan, writes),
    });
    const generationWrite = writes[0];
    const kinds = generationWrite
      .filter((node) => node["@type"] === "frame:Change")
      .map((node) => node["frame:changeKind"]);
    const attestations = generationWrite.filter(
      (node) => node["@type"] === "frame:LineageAttestation"
    );
    const contents = generationWrite.filter((node) => node["@type"] === "frame:Content");

    expect(kinds).toEqual(["root", "mutation", "removal", "prepend"]);
    expect(attestations).toHaveLength(5);
    expect(contents).toHaveLength(3);
    expect(report).toMatchObject({ commit: MERGE_SHA, frame: "A" });
  });

  test("retains malformed historical entries but refuses an absent current frame", async () => {
    const legacy = "## 2026-07-29 - Legacy\n\nUnnormalized historical frame.";
    const valid = entry("Current");
    const plan = historyPlan([
      commit(SHA, [], "2026-07-29T10:00:00Z"),
      commit(PARENT_SHA, [SHA], "2026-07-30T10:00:00Z"),
    ]);
    const writes: JsonObject[][] = [];
    const git = frameGit({
      blobs: { [SHA]: BLOB_SHA, [PARENT_SHA]: CHILD_BLOB },
      commits: plan.commits,
      contents: { [SHA]: ledger(legacy), [PARENT_SHA]: ledger(valid, legacy) },
    });
    const report = await intakeFrame({
      definition: definitionFixture,
      root: "/repo",
      git,
      atCommit: PARENT_SHA,
      historyGeneration: HISTORY_GENERATION,
      historyPlan: plan,
      client: frameClient(plan, writes),
    });
    const validity = writes[0]
      .filter((node) => node["@type"] === "frame:Assessment")
      .map((node) => node["frame:valid"])
      .sort();
    expect(validity).toEqual([false, true]);
    expect(report.frame).toBe("Current");

    const deletionPlan = historyPlan([
      ...plan.commits,
      commit(BRANCH_SHA, [PARENT_SHA], "2026-07-31T10:00:00Z"),
    ]);
    await expect(
      intakeFrame({
        definition: definitionFixture,
        root: "/repo",
        git: frameGit({
          blobs: { [SHA]: BLOB_SHA, [PARENT_SHA]: CHILD_BLOB, [BRANCH_SHA]: undefined },
          commits: deletionPlan.commits,
          contents: { [SHA]: ledger(legacy), [PARENT_SHA]: ledger(valid, legacy) },
        }),
        atCommit: BRANCH_SHA,
        historyGeneration: HISTORY_GENERATION,
        historyPlan: deletionPlan,
        client: frameClient(deletionPlan, []),
      })
    ).rejects.toThrow(/No committed frame exists/u);
  });

  test("keeps generation and attestation stable while session evidence changes observation", async () => {
    const plan = rootPlan();
    const git = frameGit({
      blobs: { [SHA]: BLOB_SHA },
      commits: plan.commits,
      contents: { [SHA]: validFrame },
    });
    const reports = [];
    for (const generationName of ["generation-123", "generation-456"]) {
      const sessionGeneration = inquiryIri(definitionFixture, "session-generation", generationName);
      reports.push(
        await intakeFrame({
          definition: definitionFixture,
          root: "/repo",
          git,
          atCommit: SHA,
          historyGeneration: HISTORY_GENERATION,
          historyPlan: plan,
          session: SESSION_IRI,
          sessionGeneration,
          sessionSource: "codex",
          client: frameClient(plan, [], { generation: sessionGeneration, source: "codex" }),
        })
      );
    }

    expect(reports[0].generation).toBe(reports[1].generation);
    expect(reports[0].attestation).toBe(reports[1].attestation);
    expect(reports[0].observation).not.toBe(reports[1].observation);
  });

  test("reuses exact immutable generation and observation receipts without writing", async () => {
    const plan = rootPlan();
    const writes: JsonObject[][] = [];
    const client = frameClient(plan, writes);
    const options = {
      definition: definitionFixture,
      root: "/repo",
      git: frameGit({
        blobs: { [SHA]: BLOB_SHA },
        commits: plan.commits,
        contents: { [SHA]: validFrame },
      }),
      atCommit: SHA,
      historyGeneration: HISTORY_GENERATION,
      historyPlan: plan,
      client,
    } as const;
    const first = await intakeFrame(options);
    const writeCount = writes.length;
    const report = await intakeFrame(options);

    expect(report).toMatchObject({ generationExisting: true, observationExisting: true });
    expect(report.generation).toBe(first.generation);
    expect(writes).toHaveLength(writeCount);
  });

  test("refuses a same-identity receipt with any extra direct RDF fact", async () => {
    const plan = rootPlan();
    const client = frameClient(plan, []);
    const options = {
      definition: definitionFixture,
      root: "/repo",
      git: frameGit({
        blobs: { [SHA]: BLOB_SHA },
        commits: plan.commits,
        contents: { [SHA]: validFrame },
      }),
      atCommit: SHA,
      historyGeneration: HISTORY_GENERATION,
      historyPlan: plan,
      client,
    } as const;
    const first = await intakeFrame(options);
    const query = client.query.bind(client);
    const poison = <Value>(value: Value): Value => {
      if (Array.isArray(value)) return value.map(poison) as Value;
      if (value === null || typeof value !== "object") return value;
      const record = value as JsonObject;
      return record["@id"] === first.generation
        ? ({ ...record, [`${namespacesFor(definitionFixture).frame}unexpected`]: true } as Value)
        : value;
    };
    client.query = async (body) => poison(await query(body));

    await expect(intakeFrame(options)).rejects.toThrow(/contradicts its content identity/u);
  });

  test("refuses a poisoned reusable member before sealing a new generation", async () => {
    const plan = rootPlan();
    const writes: JsonObject[][] = [];
    const client = frameClient(plan, writes);
    const query = client.query.bind(client);
    const poison = <Value>(value: Value): Value => {
      if (Array.isArray(value)) return value.map(poison) as Value;
      if (value === null || typeof value !== "object") return value;
      const record = value as JsonObject;
      return typeof record["@id"] === "string" && record["@id"].includes("/frame/content/")
        ? ({
            ...record,
            [`${namespacesFor(definitionFixture).frame}unexpected`]: true,
          } as Value)
        : value;
    };
    client.query = async (body) => poison(await query(body));

    await expect(
      intakeFrame({
        definition: definitionFixture,
        root: "/repo",
        git: frameGit({
          blobs: { [SHA]: BLOB_SHA },
          commits: plan.commits,
          contents: { [SHA]: validFrame },
        }),
        atCommit: SHA,
        historyGeneration: HISTORY_GENERATION,
        historyPlan: plan,
        client,
      })
    ).rejects.toThrow(/contradicts its content identity/u);
    expect(writes).toHaveLength(0);
  });

  test("admits lineage content beside an immutable predecessor content subject", async () => {
    const plan = rootPlan();
    const writes: JsonObject[][] = [];
    const parsed = parseFrameLedger(validFrame);
    const contentHash = evidenceHash(parsed.entry);
    const predecessorContent = inquiryIri(definitionFixture, "frame:content", contentHash);
    const client = frameClient(
      plan,
      writes,
      undefined,
      plan.commits.map((candidate) => candidate.sha),
      [
        {
          "@id": predecessorContent,
          "@type": "frame:Content",
          "frame:title": parsed.title,
          "frame:date": { "@value": parsed.date, "@type": "xsd:date" },
          "frame:body": { "@value": parsed.entry, "@type": "@fulltext" },
        },
      ]
    );

    await expect(
      intakeFrame({
        definition: definitionFixture,
        root: "/repo",
        git: frameGit({
          blobs: { [SHA]: BLOB_SHA },
          commits: plan.commits,
          contents: { [SHA]: validFrame },
        }),
        atCommit: SHA,
        historyGeneration: HISTORY_GENERATION,
        historyPlan: plan,
        client,
      })
    ).resolves.toMatchObject({ generationExisting: false });

    const successorContent = writes.flat().find((node) => node["@type"] === "frame:Content");
    expect(successorContent?.["@id"]).not.toBe(predecessorContent);
    expect(successorContent?.["frame:contentHash"]).toBe(contentHash);
  });

  test("computes and verifies the exact history plan when callers omit it", async () => {
    const ref = `refs/heads/main\t${SHA}\tcommit\t\t\n`;
    const log = `\x1e${SHA}\x00\x00Frame Author\x00frame@example.test\x002026-07-30T10:00:00Z\x00Frame Author\x00frame@example.test\x002026-07-30T10:00:00Z\x00Frame\x00Frame\n`;
    const git: GitRunner = {
      root: "/repo",
      text(args) {
        if (args[0] === "for-each-ref") return ref;
        if (args[0] === "log") {
          return args.includes("--no-walk=unsorted")
            ? `\x1e${SHA}\x00\x002026-07-30T10:00:00Z\n`
            : log;
        }
        if (args[0] === "rev-parse" && args[1]?.endsWith("^{commit}")) return `${SHA}\n`;
        if (args[0] === "rev-parse" && args[1] === "--verify") return `${BLOB_SHA}\n`;
        throw new Error(`Unexpected Git text command: ${args.join(" ")}`);
      },
      bytes(args) {
        if (args[0] === "show") return new TextEncoder().encode(validFrame);
        throw new Error(`Unexpected Git bytes command: ${args.join(" ")}`);
      },
    };
    const computed = planHistoryIntake({ definition: definitionFixture, root: "/repo", git });
    const writes: JsonObject[][] = [];
    const report = await intakeFrame({
      definition: definitionFixture,
      root: "/repo",
      git,
      atCommit: SHA,
      historyGeneration: computed.generationIri,
      client: frameClient(computed, writes),
    });

    expect(report.generation).toContain("frame/generation");
    expect(writes).toHaveLength(2);
  });

  test("refuses incomplete session and mismatched exact history evidence", async () => {
    const plan = rootPlan();
    const git = frameGit({
      blobs: { [SHA]: BLOB_SHA },
      commits: plan.commits,
      contents: { [SHA]: validFrame },
    });
    await expect(
      intakeFrame({
        definition: definitionFixture,
        root: "/repo",
        git,
        atCommit: SHA,
        historyGeneration: HISTORY_GENERATION,
        historyPlan: plan,
        sessionGeneration: inquiryIri(definitionFixture, "session-generation", "generation-123"),
        client: frameClient(plan, []),
      })
    ).rejects.toThrow(/requires session, sessionGeneration, and sessionSource/u);

    const incompleteClient = frameClient(plan, []);
    incompleteClient.query = async () => [[PARENT_SHA]];
    await expect(
      intakeFrame({
        definition: definitionFixture,
        root: "/repo",
        git,
        atCommit: SHA,
        historyGeneration: HISTORY_GENERATION,
        historyPlan: plan,
        client: incompleteClient,
      })
    ).rejects.toThrow(/exact complete history evidence/u);

    const missingChangeClient = frameClient(plan, [], undefined, []);
    await expect(
      intakeFrame({
        definition: definitionFixture,
        root: "/repo",
        git,
        atCommit: SHA,
        historyGeneration: HISTORY_GENERATION,
        historyPlan: plan,
        client: missingChangeClient,
      })
    ).rejects.toThrow(/without exact parent-relative git:Change evidence/u);

    const falsePlan = historyPlan([{ ...plan.commits[0], committedAt: "2026-07-30T11:00:00Z" }]);
    await expect(
      intakeFrame({
        definition: definitionFixture,
        root: "/repo",
        git,
        atCommit: SHA,
        historyGeneration: HISTORY_GENERATION,
        historyPlan: falsePlan,
        client: frameClient(plan, []),
      })
    ).rejects.toThrow(/contradicts exact Git facts/u);
  });
});
