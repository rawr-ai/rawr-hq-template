import type { InquiryDefinition, InquiryRefPolicy } from "./definition";
import type { FlureeClient, JsonObject } from "./fluree-client";
import { assertGitObjectId, createGitRunner, type GitRunner } from "./git";
import { contextFor, dateTimeLiteral, evidenceHash, inquiryIri } from "./namespaces";

/** Bump only when the authored Git observation contract changes. */
export const HISTORY_INTAKE_VERSION = "git-history-v2" as const;

export interface GitRef {
  readonly name: string;
  readonly target: string;
  readonly objectType: string;
  readonly peeledTarget?: string;
  readonly peeledType?: string;
}

export interface ExcludedGitRef extends GitRef {
  readonly refClass: string;
  readonly reason: "excluded" | "not-included";
}

export interface GitCommit {
  readonly sha: string;
  readonly parents: readonly string[];
  readonly authorName: string;
  readonly authorEmail: string;
  readonly authoredAt: string;
  readonly committerName: string;
  readonly committerEmail: string;
  readonly committedAt: string;
  readonly subject: string;
  readonly message: string;
}

export interface RawGitChange {
  readonly status: string;
  readonly similarity?: number;
  readonly oldPath?: string;
  readonly path: string;
  readonly oldMode: string;
  readonly newMode: string;
  readonly oldBlob?: string;
  readonly newBlob?: string;
}

export interface GitChangeStats {
  readonly additions?: number;
  readonly deletions?: number;
  readonly binary: boolean;
  readonly oldPath?: string;
}

export interface HistoryIntakePlan {
  readonly definitionId: string;
  readonly ledger: string;
  readonly namespace: string;
  readonly intakeVersion: typeof HISTORY_INTAKE_VERSION;
  readonly refPolicyVersion: string;
  readonly refs: readonly GitRef[];
  readonly includedRefs: readonly GitRef[];
  readonly excludedRefs: readonly ExcludedGitRef[];
  readonly pinnedRoots: readonly string[];
  readonly commits: readonly GitCommit[];
  readonly corpusHash: string;
  readonly generationKey: string;
  readonly generationIri: string;
}

export interface PlanHistoryIntakeOptions {
  readonly definition: InquiryDefinition;
  readonly root: string;
  readonly git?: GitRunner;
}

type HistoryClient = Pick<FlureeClient, "insert" | "ledger" | "query">;

export interface IntakeHistoryOptions extends PlanHistoryIntakeOptions {
  readonly client: HistoryClient;
  readonly plan?: HistoryIntakePlan;
  readonly chunkSize?: number;
  readonly onCommit?: (progress: {
    readonly completed: number;
    readonly total: number;
    readonly sha: string;
  }) => void;
}

export interface HistoryIntakeReport {
  readonly ledger: string;
  readonly generation: string;
  readonly corpusHash: string;
  readonly intakeVersion: typeof HISTORY_INTAKE_VERSION;
  readonly commits: number;
  readonly existingCommits: number;
  readonly ingestedCommits: number;
  readonly parentRelativeChanges: number;
  readonly includedRefs: number;
  readonly excludedRefs: number;
  /** Explicit commit roots admitted outside the ref-policy corpus. */
  readonly pinnedRoots: readonly string[];
  readonly alreadyComplete: boolean;
}

export interface AssertHistoryObservationOptions {
  readonly client: Pick<FlureeClient, "ledger" | "query">;
  readonly commit: string;
  readonly definition: InquiryDefinition;
  readonly generation?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function responseRows(response: unknown): readonly unknown[] {
  if (Array.isArray(response)) return response;
  if (isRecord(response) && Array.isArray(response.result)) return response.result;
  return [];
}

function rowValue(row: unknown, name: string, index: number): unknown {
  if (Array.isArray(row)) return row[index];
  if (!isRecord(row)) return undefined;
  return row[name] ?? row[`?${name}`];
}

/**
 * Require one exact Git commit to belong to a completed history generation.
 *
 * Supplying a generation tightens the check to that exact corpus rather than
 * accepting membership in any prior completed replay.
 */
export async function assertHistoryObservation(
  options: AssertHistoryObservationOptions
): Promise<void> {
  const commit = assertGitObjectId(options.commit, "history observation commit");
  if (options.client.ledger !== options.definition.ledger) {
    throw new Error(
      `Fluree client ledger '${options.client.ledger}' does not match definition '${options.definition.ledger}'`
    );
  }
  const generationPrefix = inquiryIri(options.definition, "git:history-generation", "");
  if (
    options.generation !== undefined &&
    (!options.generation.startsWith(generationPrefix) ||
      options.generation.length === generationPrefix.length)
  ) {
    throw new Error("History generation must be an identity from this inquiry");
  }
  const generation = options.generation ?? "?generation";
  const response = await options.client.query({
    "@context": contextFor(options.definition),
    from: options.definition.ledger,
    select: ["?commit"],
    where: [
      {
        "@id": inquiryIri(options.definition, "git:commit", commit),
        "@type": "git:Commit",
        "git:sha": commit,
        "git:observedIn": { "@id": generation },
      },
      {
        "@id": generation,
        "@type": "git:HistoryGeneration",
        "git:intakeVersion": HISTORY_INTAKE_VERSION,
        "git:complete": true,
      },
    ],
    limit: 1,
    reasoning: "none",
  });
  if (responseRows(response).length === 0) {
    throw new Error(
      `Commit ${commit} is not present in ${
        options.generation === undefined ? "complete history evidence" : options.generation
      }`
    );
  }
}

/** Parse the stable tab-delimited output requested from `git for-each-ref`. */
export function parseGitRefs(output: string): readonly GitRef[] {
  return output
    .split(/\r?\n/u)
    .filter((line) => line !== "")
    .map((line) => {
      const fields = line.split("\t");
      if (fields.length !== 5) {
        throw new Error(`Invalid git ref record '${line}'`);
      }
      const [name, target, objectType, peeledTarget, peeledType] = fields;
      if (!name.startsWith("refs/")) throw new Error(`Invalid Git ref name '${name}'`);
      assertGitObjectId(target, `target for ${name}`);
      if (peeledTarget !== "") assertGitObjectId(peeledTarget, `peeled target for ${name}`);
      return {
        name,
        target,
        objectType,
        ...(peeledTarget === "" ? {} : { peeledTarget }),
        ...(peeledType === "" ? {} : { peeledType }),
      };
    });
}

function refClass(name: string, policy: InquiryRefPolicy): string {
  return (
    [...policy.include, ...policy.exclude]
      .filter((prefix) => name.startsWith(prefix))
      .sort((left, right) => right.length - left.length)[0] ?? "other"
  );
}

/** Apply one reviewed prefix policy while retaining every excluded observation. */
export function applyRefPolicy(
  refs: readonly GitRef[],
  policy: InquiryRefPolicy
): {
  readonly included: readonly GitRef[];
  readonly excluded: readonly ExcludedGitRef[];
} {
  const included: GitRef[] = [];
  const excluded: ExcludedGitRef[] = [];
  for (const ref of refs) {
    const excludedByRule = policy.exclude.some((prefix) => ref.name.startsWith(prefix));
    const includedByRule = policy.include.some((prefix) => ref.name.startsWith(prefix));
    if (includedByRule && !excludedByRule) {
      included.push(ref);
    } else {
      excluded.push({
        ...ref,
        refClass: refClass(ref.name, policy),
        reason: excludedByRule ? "excluded" : "not-included",
      });
    }
  }
  return { included, excluded };
}

/** Parse the lossless NUL-delimited raw-diff format emitted by Git. */
export function parseRawDiff(buffer: Uint8Array): readonly RawGitChange[] {
  const tokens = new TextDecoder().decode(buffer).split("\0");
  if (tokens.at(-1) === "") tokens.pop();
  const changes: RawGitChange[] = [];
  for (let index = 0; index < tokens.length; ) {
    const header = tokens[index++];
    const match = header.match(/^:(\d{6}) (\d{6}) ([0-9a-f]+) ([0-9a-f]+) ([A-Z])(\d*)$/u);
    if (match === null) throw new Error(`Invalid raw diff header: ${header}`);
    const [, oldMode, newMode, oldBlob, newBlob, status, score] = match;
    const firstPath = tokens[index++];
    if (firstPath === undefined) {
      throw new Error(`Missing path for raw diff header '${header}'`);
    }
    const renameOrCopy = status === "R" || status === "C";
    const path = renameOrCopy ? tokens[index++] : firstPath;
    if (path === undefined) {
      throw new Error(`Missing destination path for raw diff header '${header}'`);
    }
    changes.push({
      status,
      ...(score === "" ? {} : { similarity: Number(score) }),
      ...(renameOrCopy ? { oldPath: firstPath } : {}),
      path,
      oldMode,
      newMode,
      ...(oldBlob === "0".repeat(oldBlob.length) ? {} : { oldBlob }),
      ...(newBlob === "0".repeat(newBlob.length) ? {} : { newBlob }),
    });
  }
  return changes;
}

/** Parse text, binary, and rename-aware `git --numstat -z` records. */
export function parseNumstat(buffer: Uint8Array): ReadonlyMap<string, GitChangeStats> {
  const tokens = new TextDecoder().decode(buffer).split("\0");
  if (tokens.at(-1) === "") tokens.pop();
  const stats = new Map<string, GitChangeStats>();
  for (let index = 0; index < tokens.length; ) {
    const token = tokens[index++];
    const firstTab = token.indexOf("\t");
    const secondTab = token.indexOf("\t", firstTab + 1);
    if (firstTab === -1 || secondTab === -1) {
      throw new Error(`Invalid git numstat record '${token}'`);
    }
    const added = token.slice(0, firstTab);
    const deleted = token.slice(firstTab + 1, secondTab);
    let path = token.slice(secondTab + 1);
    let oldPath: string | undefined;
    if (path === "") {
      oldPath = tokens[index++];
      path = tokens[index++];
      if (oldPath === undefined || path === undefined) {
        throw new Error("Incomplete renamed numstat record");
      }
    }
    stats.set(path, {
      ...(added === "-" ? {} : { additions: Number(added) }),
      ...(deleted === "-" ? {} : { deletions: Number(deleted) }),
      binary: added === "-" || deleted === "-",
      ...(oldPath === undefined ? {} : { oldPath }),
    });
  }
  return stats;
}

function parseCommitLog(output: string): readonly GitCommit[] {
  return output
    .split("\x1e")
    .filter(Boolean)
    .map((record) => {
      const fields = record.replace(/^\n/u, "").split("\0");
      if (fields.length < 10) throw new Error("Invalid Git commit record");
      const sha = assertGitObjectId(fields[0], "commit");
      const parents =
        fields[1] === ""
          ? []
          : fields[1].split(" ").map((parent) => assertGitObjectId(parent, "parent"));
      return {
        sha,
        parents,
        authorName: fields[2],
        authorEmail: fields[3],
        authoredAt: fields[4],
        committerName: fields[5],
        committerEmail: fields[6],
        committedAt: fields[7],
        subject: fields[8],
        message: fields.slice(9).join("\0").trim(),
      };
    });
}

function commitTargets(refs: readonly GitRef[]): readonly string[] {
  return [
    ...new Set(
      refs.flatMap((ref) => {
        if (ref.objectType === "commit") return [ref.target];
        if (ref.peeledType === "commit" && ref.peeledTarget !== undefined) {
          return [ref.peeledTarget];
        }
        return [];
      })
    ),
  ];
}

/** Inventory every ref and every commit reachable from the admitted ref set. */
export function planHistoryIntake(options: PlanHistoryIntakeOptions): HistoryIntakePlan {
  const { definition } = options;
  const git = options.git ?? createGitRunner(options.root);
  const refs = parseGitRefs(
    git.text([
      "for-each-ref",
      "--format=%(refname)%09%(objectname)%09%(objecttype)%09%(*objectname)%09%(*objecttype)",
    ])
  );
  const selected = applyRefPolicy(refs, definition.repository.refPolicy);
  const pinnedRoots = definition.repository.pins.map((pin) => {
    git.text(["cat-file", "-e", `${pin}^{commit}`]);
    return pin;
  });
  const targets = [...new Set([...commitTargets(selected.included), ...pinnedRoots])];
  if (targets.length === 0) {
    throw new Error("The selected ref policy reaches no Git commits");
  }
  const format = ["%x1e%H", "%P", "%an", "%ae", "%aI", "%cn", "%ce", "%cI", "%s", "%B"].join(
    "%x00"
  );
  const commits = parseCommitLog(
    git.text(["log", "--stdin", "--topo-order", "--reverse", `--format=${format}`], {
      input: `${targets.join("\n")}\n`,
    })
  );
  if (commits.length === 0) throw new Error("The selected refs contain no reachable commits");

  const corpusHash = evidenceHash(
    [
      `definition\0${definition.id}`,
      `intake\0${HISTORY_INTAKE_VERSION}`,
      `policy\0${definition.repository.refPolicy.version}`,
      ...refs.map((ref) =>
        [
          "ref",
          ref.name,
          ref.target,
          ref.objectType,
          ref.peeledTarget ?? "",
          ref.peeledType ?? "",
          selected.included.includes(ref) ? "included" : "excluded",
        ].join("\0")
      ),
      ...commits.map((commit) => `commit\0${commit.sha}`),
      ...pinnedRoots.map((commit) => `pin\0${commit}`),
    ]
      .sort()
      .join("\n")
  );
  const generationKey = evidenceHash(
    `${HISTORY_INTAKE_VERSION}\0${definition.id}\0${definition.repository.refPolicy.version}\0${corpusHash}`
  );
  return {
    definitionId: definition.id,
    ledger: definition.ledger,
    namespace: definition.namespace,
    intakeVersion: HISTORY_INTAKE_VERSION,
    refPolicyVersion: definition.repository.refPolicy.version,
    refs,
    includedRefs: selected.included,
    excludedRefs: selected.excluded,
    pinnedRoots,
    commits,
    corpusHash,
    generationKey,
    generationIri: inquiryIri(definition, "git:history-generation", generationKey),
  };
}

function fulltext(value: string): JsonObject {
  return { "@value": value, "@type": "@fulltext" };
}

function commitNodes(
  definition: InquiryDefinition,
  plan: HistoryIntakePlan,
  commit: GitCommit
): readonly JsonObject[] {
  const repository = inquiryIri(definition, "git:repository", definition.id);
  const author = inquiryIri(
    definition,
    "git:identity",
    evidenceHash(`${commit.authorName}\0${commit.authorEmail}`)
  );
  const committer = inquiryIri(
    definition,
    "git:identity",
    evidenceHash(`${commit.committerName}\0${commit.committerEmail}`)
  );
  return [
    {
      "@id": inquiryIri(definition, "git:commit", commit.sha),
      "@type": "git:Commit",
      "git:sha": commit.sha,
      "git:subject": fulltext(commit.subject),
      "git:message": fulltext(commit.message),
      "git:authoredAt": dateTimeLiteral(commit.authoredAt),
      "git:committedAt": dateTimeLiteral(commit.committedAt),
      "git:author": { "@id": author },
      "git:committer": { "@id": committer },
      "git:repository": { "@id": repository },
      "git:observedIn": { "@id": plan.generationIri },
      ...(commit.parents.length === 0
        ? {}
        : {
            "git:parent": commit.parents.map((parent) => ({
              "@id": inquiryIri(definition, "git:commit", parent),
            })),
          }),
    },
    {
      "@id": author,
      "@type": "git:Identity",
      "git:name": commit.authorName,
      "git:email": commit.authorEmail,
    },
    {
      "@id": committer,
      "@type": "git:Identity",
      "git:name": commit.committerName,
      "git:email": commit.committerEmail,
    },
  ];
}

function changeSetIdentity(commit: string, parent: string | undefined): string {
  return `${HISTORY_INTAKE_VERSION}:${commit}:${parent ?? "root"}`;
}

/** Project one exact parent-relative Git change without semantic classification. */
export function changeNode(
  definition: InquiryDefinition,
  input: {
    readonly commit: string;
    readonly parent?: string;
    readonly index: number;
    readonly change: RawGitChange;
    readonly stats?: GitChangeStats;
  }
): JsonObject {
  const setIdentity = changeSetIdentity(input.commit, input.parent);
  const identity = `${setIdentity}:${input.index}:${input.change.oldPath ?? ""}:${input.change.path}`;
  return {
    "@id": inquiryIri(definition, "git:change", evidenceHash(identity)),
    "@type": "git:Change",
    "git:intakeVersion": HISTORY_INTAKE_VERSION,
    "git:status": input.change.status,
    "git:path": input.change.path,
    "git:commit": { "@id": inquiryIri(definition, "git:commit", input.commit) },
    "git:changeSet": {
      "@id": inquiryIri(definition, "git:change-set", setIdentity),
    },
    ...(input.change.oldPath === undefined ? {} : { "git:oldPath": input.change.oldPath }),
    ...(input.change.oldBlob === undefined
      ? {}
      : {
          "git:beforeBlob": {
            "@id": inquiryIri(definition, "git:blob", input.change.oldBlob),
          },
        }),
    ...(input.change.newBlob === undefined
      ? {}
      : {
          "git:afterBlob": {
            "@id": inquiryIri(definition, "git:blob", input.change.newBlob),
          },
        }),
    "git:oldMode": input.change.oldMode,
    "git:newMode": input.change.newMode,
    ...(input.change.similarity === undefined
      ? {}
      : {
          "git:similarity": input.change.similarity / 100,
          "git:renameMethod": "git-diff-M50",
        }),
    ...(input.stats?.additions === undefined ? {} : { "git:additions": input.stats.additions }),
    ...(input.stats?.deletions === undefined ? {} : { "git:deletions": input.stats.deletions }),
    ...(input.stats?.binary === true ? { "git:binary": true } : {}),
  };
}

function changeSetNode(
  definition: InquiryDefinition,
  commit: GitCommit,
  parent: string | undefined,
  count: number
): JsonObject {
  const identity = changeSetIdentity(commit.sha, parent);
  return {
    "@id": inquiryIri(definition, "git:change-set", identity),
    "@type": "git:ChangeSet",
    "git:intakeVersion": HISTORY_INTAKE_VERSION,
    "git:commit": { "@id": inquiryIri(definition, "git:commit", commit.sha) },
    "git:parent": {
      "@id":
        parent === undefined
          ? inquiryIri(definition, "git:root", "empty-tree")
          : inquiryIri(definition, "git:commit", parent),
    },
    "git:changeCount": count,
    "git:diffAlgorithm": "git-diff-M50-l10000",
  };
}

function commitCompletionNode(
  definition: InquiryDefinition,
  commit: GitCommit,
  changes: number
): JsonObject {
  return {
    "@id": inquiryIri(definition, "git:commit-intake", `${HISTORY_INTAKE_VERSION}:${commit.sha}`),
    "@type": "git:CommitIntake",
    "git:intakeVersion": HISTORY_INTAKE_VERSION,
    "git:commit": { "@id": inquiryIri(definition, "git:commit", commit.sha) },
    "git:changeSetCount": Math.max(1, commit.parents.length),
    "git:changeCount": changes,
    "git:complete": true,
  };
}

function relativeChanges(
  definition: InquiryDefinition,
  commit: GitCommit,
  git: GitRunner
): { readonly nodes: readonly JsonObject[]; readonly count: number } {
  const nodes: JsonObject[] = [];
  const parents = commit.parents.length === 0 ? [undefined] : commit.parents;
  let count = 0;
  for (const parent of parents) {
    const common = ["-r", "-M50%", "-l10000"];
    const rawArgs =
      parent === undefined
        ? [
            "diff-tree",
            "--root",
            "--no-commit-id",
            "--raw",
            "--no-abbrev",
            "-z",
            ...common,
            commit.sha,
          ]
        : ["diff", "--raw", "--no-abbrev", "-z", ...common, parent, commit.sha];
    const statArgs =
      parent === undefined
        ? ["diff-tree", "--root", "--no-commit-id", "--numstat", "-z", ...common, commit.sha]
        : ["diff", "--numstat", "-z", ...common, parent, commit.sha];
    const changes = parseRawDiff(git.bytes(rawArgs));
    const stats = parseNumstat(git.bytes(statArgs));
    nodes.push(changeSetNode(definition, commit, parent, changes.length));
    nodes.push(
      ...changes.map((change, index) =>
        changeNode(definition, {
          commit: commit.sha,
          ...(parent === undefined ? {} : { parent }),
          index,
          change,
          stats: stats.get(change.path),
        })
      )
    );
    count += changes.length;
  }
  return { nodes, count };
}

function refNodes(definition: InquiryDefinition, plan: HistoryIntakePlan): readonly JsonObject[] {
  const repository = inquiryIri(definition, "git:repository", definition.id);
  const included = plan.includedRefs.flatMap((ref) => {
    const refId = inquiryIri(definition, "git:ref", evidenceHash(ref.name));
    const observationId = inquiryIri(
      definition,
      "git:ref-observation",
      evidenceHash(`${plan.generationKey}\0${ref.name}\0${ref.target}`)
    );
    const commitTarget =
      ref.objectType === "commit"
        ? ref.target
        : ref.peeledType === "commit"
          ? ref.peeledTarget
          : undefined;
    return [
      {
        "@id": refId,
        "@type": "git:Ref",
        "git:name": ref.name,
        "git:repository": { "@id": repository },
        "git:observation": { "@id": observationId },
      },
      {
        "@id": observationId,
        "@type": "git:RefObservation",
        "git:generation": { "@id": plan.generationIri },
        "git:ref": { "@id": refId },
        "git:objectType": ref.objectType,
        "git:target": { "@id": inquiryIri(definition, "git:object", ref.target) },
        ...(ref.peeledTarget === undefined
          ? {}
          : {
              "git:peeledTarget": {
                "@id": inquiryIri(definition, "git:object", ref.peeledTarget),
              },
              "git:peeledType": ref.peeledType,
            }),
        ...(commitTarget === undefined
          ? {}
          : {
              "git:commitTarget": {
                "@id": inquiryIri(definition, "git:commit", commitTarget),
              },
            }),
      },
    ] satisfies readonly JsonObject[];
  });
  const excluded = plan.excludedRefs.map(
    (ref): JsonObject => ({
      "@id": inquiryIri(
        definition,
        "git:excluded-ref",
        evidenceHash(`${plan.generationKey}\0${ref.name}\0${ref.target}`)
      ),
      "@type": "git:ExcludedRef",
      "git:generation": { "@id": plan.generationIri },
      "git:name": ref.name,
      "git:objectType": ref.objectType,
      "git:target": { "@id": inquiryIri(definition, "git:object", ref.target) },
      "git:reason": ref.reason,
      "git:refClass": ref.refClass,
      "git:repository": { "@id": repository },
      ...(ref.peeledTarget === undefined
        ? {}
        : {
            "git:peeledTarget": {
              "@id": inquiryIri(definition, "git:object", ref.peeledTarget),
            },
            "git:peeledType": ref.peeledType,
          }),
    })
  );
  return [...included, ...excluded];
}

function generationCompletionNode(
  definition: InquiryDefinition,
  plan: HistoryIntakePlan
): JsonObject {
  return {
    "@id": plan.generationIri,
    "@type": "git:HistoryGeneration",
    "git:intakeVersion": HISTORY_INTAKE_VERSION,
    "git:refPolicyVersion": plan.refPolicyVersion,
    "git:repository": {
      "@id": inquiryIri(definition, "git:repository", definition.id),
    },
    "git:corpusHash": plan.corpusHash,
    "git:commitCount": plan.commits.length,
    "git:selectedRefCount": plan.includedRefs.length,
    "git:excludedRefCount": plan.excludedRefs.length,
    "git:pinnedRootCount": plan.pinnedRoots.length,
    ...(plan.pinnedRoots.length === 0
      ? {}
      : {
          "git:pinnedRoot": plan.pinnedRoots.map((pin) => ({
            "@id": inquiryIri(definition, "git:commit", pin),
          })),
        }),
    "git:complete": true,
  };
}

async function generationIsComplete(
  client: HistoryClient,
  definition: InquiryDefinition,
  plan: HistoryIntakePlan
): Promise<boolean> {
  const response = await client.query({
    "@context": contextFor(definition),
    from: definition.ledger,
    select: ["?complete"],
    where: {
      "@id": plan.generationIri,
      "@type": "git:HistoryGeneration",
      "git:intakeVersion": HISTORY_INTAKE_VERSION,
      "git:complete": "?complete",
    },
    limit: 1,
    reasoning: "none",
  });
  return responseRows(response).some((row) => rowValue(row, "complete", 0) === true);
}

async function completedCommitShas(
  client: HistoryClient,
  definition: InquiryDefinition
): Promise<ReadonlySet<string>> {
  const response = await client.query({
    "@context": contextFor(definition),
    from: definition.ledger,
    select: ["?sha"],
    where: [
      {
        "@id": "?intake",
        "@type": "git:CommitIntake",
        "git:intakeVersion": HISTORY_INTAKE_VERSION,
        "git:commit": { "@id": "?commit" },
        "git:complete": true,
      },
      {
        "@id": "?commit",
        "@type": "git:Commit",
        "git:sha": "?sha",
      },
    ],
    reasoning: "none",
  });
  return new Set(
    responseRows(response)
      .map((row) => rowValue(row, "sha", 0))
      .filter((value): value is string => typeof value === "string")
  );
}

function commitGenerationMembershipNodes(
  definition: InquiryDefinition,
  plan: HistoryIntakePlan,
  commits: readonly GitCommit[]
): readonly JsonObject[] {
  return commits.map(
    (commit): JsonObject => ({
      "@id": inquiryIri(definition, "git:commit", commit.sha),
      "git:observedIn": { "@id": plan.generationIri },
    })
  );
}

async function writeChunks(
  client: HistoryClient,
  definition: InquiryDefinition,
  nodes: readonly JsonObject[],
  chunkSize: number,
  metadata: JsonObject
): Promise<void> {
  for (let offset = 0; offset < nodes.length; offset += chunkSize) {
    await client.insert(nodes.slice(offset, offset + chunkSize), {
      context: contextFor(definition),
      metadata,
    });
  }
}

async function writePendingCommits(
  options: Pick<IntakeHistoryOptions, "onCommit"> & {
    readonly chunkSize: number;
    readonly client: HistoryClient;
    readonly definition: InquiryDefinition;
    readonly git: GitRunner;
    readonly pending: readonly GitCommit[];
    readonly plan: HistoryIntakePlan;
  }
): Promise<number> {
  const { chunkSize, client, definition, git, pending, plan } = options;
  let parentRelativeChanges = 0;
  let batchNodes: JsonObject[] = [];
  let batchCommits: Array<{ readonly index: number; readonly sha: string }> = [];

  const flush = async (): Promise<void> => {
    if (batchNodes.length === 0) return;
    await client.insert(batchNodes, {
      context: contextFor(definition),
      metadata: {
        "meta:job": "git-history-intake",
        "meta:generation": plan.generationIri,
        "meta:gitSha": batchCommits.map((commit) => commit.sha),
      },
    });
    for (const commit of batchCommits) {
      options.onCommit?.({
        completed: commit.index + 1,
        total: pending.length,
        sha: commit.sha,
      });
    }
    batchNodes = [];
    batchCommits = [];
  };

  for (const [index, commit] of pending.entries()) {
    const relative = relativeChanges(definition, commit, git);
    parentRelativeChanges += relative.count;
    const commitBatch = [
      ...commitNodes(definition, plan, commit),
      ...relative.nodes,
      commitCompletionNode(definition, commit, relative.count),
    ];
    if (commitBatch.length > chunkSize) {
      await flush();
      await writeChunks(client, definition, commitBatch, chunkSize, {
        "meta:job": "git-history-intake",
        "meta:generation": plan.generationIri,
        "meta:gitSha": commit.sha,
      });
      options.onCommit?.({
        completed: index + 1,
        total: pending.length,
        sha: commit.sha,
      });
      continue;
    }
    if (batchNodes.length + commitBatch.length > chunkSize) await flush();
    batchNodes.push(...commitBatch);
    batchCommits.push({ index, sha: commit.sha });
  }
  await flush();
  return parentRelativeChanges;
}

/** Replay one complete, versioned full-ref generation into Fluree. */
export async function intakeHistory(options: IntakeHistoryOptions): Promise<HistoryIntakeReport> {
  const definition = options.definition;
  const client = options.client;
  if (client.ledger !== definition.ledger) {
    throw new Error(
      `Fluree client ledger '${client.ledger}' does not match definition '${definition.ledger}'`
    );
  }
  const chunkSize = options.chunkSize ?? 2_000;
  if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
    throw new Error("History chunk size must be a positive integer");
  }
  const git = options.git ?? createGitRunner(options.root);
  const plan =
    options.plan ??
    planHistoryIntake({
      definition,
      root: options.root,
      git,
    });
  if (
    plan.definitionId !== definition.id ||
    plan.ledger !== definition.ledger ||
    plan.namespace !== definition.namespace ||
    plan.refPolicyVersion !== definition.repository.refPolicy.version ||
    plan.pinnedRoots.length !== definition.repository.pins.length ||
    plan.pinnedRoots.some((pin, index) => pin !== definition.repository.pins[index])
  ) {
    throw new Error("History plan does not belong to this inquiry definition");
  }

  const complete = await generationIsComplete(client, definition, plan);
  if (complete) {
    return {
      ledger: definition.ledger,
      generation: plan.generationIri,
      corpusHash: plan.corpusHash,
      intakeVersion: HISTORY_INTAKE_VERSION,
      commits: plan.commits.length,
      existingCommits: plan.commits.length,
      ingestedCommits: 0,
      parentRelativeChanges: 0,
      includedRefs: plan.includedRefs.length,
      excludedRefs: plan.excludedRefs.length,
      pinnedRoots: plan.pinnedRoots,
      alreadyComplete: true,
    };
  }

  const completedShas = await completedCommitShas(client, definition);
  const prior = plan.commits.filter((commit) => completedShas.has(commit.sha));
  const pending = plan.commits.filter((commit) => !completedShas.has(commit.sha));
  const parentRelativeChanges = await writePendingCommits({
    chunkSize,
    client,
    definition,
    git,
    onCommit: options.onCommit,
    pending,
    plan,
  });

  await writeChunks(
    client,
    definition,
    commitGenerationMembershipNodes(definition, plan, prior),
    chunkSize,
    {
      "meta:job": "git-history-generation-membership",
      "meta:generation": plan.generationIri,
    }
  );
  await writeChunks(client, definition, refNodes(definition, plan), chunkSize, {
    "meta:job": "git-ref-observation",
    "meta:generation": plan.generationIri,
  });
  await client.insert(
    [
      {
        "@id": inquiryIri(definition, "git:repository", definition.id),
        "@type": "git:Repository",
        "git:name": definition.id,
        "git:definition": definition.repository.definition,
      },
      generationCompletionNode(definition, plan),
    ],
    {
      context: contextFor(definition),
      metadata: {
        "meta:job": "git-history-generation-complete",
        "meta:generation": plan.generationIri,
        "meta:corpusHash": plan.corpusHash,
      },
    }
  );

  return {
    ledger: definition.ledger,
    generation: plan.generationIri,
    corpusHash: plan.corpusHash,
    intakeVersion: HISTORY_INTAKE_VERSION,
    commits: plan.commits.length,
    existingCommits: prior.length,
    ingestedCommits: pending.length,
    parentRelativeChanges,
    includedRefs: plan.includedRefs.length,
    excludedRefs: plan.excludedRefs.length,
    pinnedRoots: plan.pinnedRoots,
    alreadyComplete: false,
  };
}
