import type { InquiryDefinition } from "./definition";
import type { FlureeClient, JsonObject } from "./fluree-client";
import { assertGitObjectId, createGitRunner, type GitRunner } from "./git";
import {
  assertHistoryObservation,
  type GitCommit,
  type HistoryIntakePlan,
  planHistoryIntake,
} from "./history";
import {
  contextFor,
  dateTimeLiteral,
  evidenceHash,
  inquiryIri,
  namespacesFor,
  transactionMetadataSource,
} from "./namespaces";
import { canonicalProjectionTriples, constantSubjectExpansions } from "./projection";

export const FRAME_PARSER_VERSION = "frame-parser-v3" as const;
export const FRAME_RECONSTRUCTION_VERSION = "frame-reconstruction-v2" as const;
export const FRAME_SCHEMA_VERSION = "frame-lineage-v1" as const;
export const FRAME_CONTENT_IDENTITY_VERSION = "frame-content-identity-v2" as const;

export interface FrameBag {
  readonly name: string;
  readonly terms: readonly string[];
}

export interface FrameRelation {
  readonly source: string;
  readonly predicate: string;
  readonly target: string;
}

export interface ParsedFrameLedger {
  readonly date: string;
  readonly title: string;
  readonly entry: string;
  readonly bags: readonly FrameBag[];
  readonly relations: readonly FrameRelation[];
}

export interface ParsedFrameOccurrence {
  readonly ordinal: number;
  readonly byteStart: number;
  /** Exclusive UTF-8 byte offset. */
  readonly byteEnd: number;
  readonly entry: string;
  readonly contentHash: string;
  readonly valid: boolean;
  readonly issues: readonly string[];
  readonly frame?: ParsedFrameLedger;
}

export interface IntakeFrameOptions {
  readonly definition: InquiryDefinition;
  readonly client: Pick<FlureeClient, "insert" | "query" | "ledger">;
  readonly root: string;
  readonly atCommit: string;
  readonly historyGeneration: string;
  readonly historyPlan?: HistoryIntakePlan;
  readonly session?: string;
  readonly sessionGeneration?: string;
  readonly sessionSource?: string;
  readonly git?: GitRunner;
}

export interface FrameIntakeReport {
  readonly ledger: string;
  readonly attestation: string;
  readonly frame: string;
  readonly observedCommit: string;
  readonly commit: string;
  readonly blob: string;
  readonly sourceCommittedAt: string;
  readonly attestedAt: string;
  readonly bagCount: number;
  readonly relationCount: number;
  readonly generation: string;
  readonly observation: string;
  readonly assessmentCount: number;
  readonly membershipCount: number;
  readonly changeCount: number;
  readonly generationExisting: boolean;
  readonly observationExisting: boolean;
  readonly session?: string;
  readonly sessionGeneration?: string;
  readonly sessionSource?: string;
}

interface FrameAssessmentProjection {
  readonly id: string;
  readonly nodes: readonly JsonObject[];
  readonly memberIds: readonly string[];
}

interface BlobOccurrenceState {
  readonly occurrence: ParsedFrameOccurrence;
  readonly contentId: string;
  readonly assessmentId: string;
  readonly attestationId: string;
}

interface CommitFrameState {
  readonly blob?: string;
  readonly occurrences: readonly BlobOccurrenceState[];
}

interface AttestationSource {
  readonly commit: GitCommit;
  readonly blob: string;
  readonly occurrence: ParsedFrameOccurrence;
}

interface Alignment {
  readonly conforming: boolean;
  readonly matches: readonly (readonly [number, number])[];
  readonly added: readonly number[];
  readonly removed: readonly number[];
}

function responseRows(response: unknown): readonly unknown[] {
  if (Array.isArray(response)) return response;
  if (
    response !== null &&
    typeof response === "object" &&
    !Array.isArray(response) &&
    Array.isArray((response as { readonly result?: unknown }).result)
  ) {
    return (response as { readonly result: readonly unknown[] }).result;
  }
  return [];
}

function rowValue(row: unknown, name: string, index: number): unknown {
  if (Array.isArray(row)) return row[index];
  if (row === null || typeof row !== "object") return undefined;
  const record = row as Record<string, unknown>;
  return record[name] ?? record[`?${name}`];
}

function literalValue(value: unknown): unknown {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  return record["@id"] ?? record["@value"] ?? record.value ?? value;
}

function expandInquiryIri(definition: InquiryDefinition, value: unknown): unknown {
  const literal = literalValue(value);
  return typeof literal === "string" && literal.startsWith("id:")
    ? `${definition.namespace}id/${literal.slice(3)}`
    : literal;
}

/** Parse failure retaining the exact committed source that was refused. */
export class FrameParseError extends Error {
  readonly commit: string;

  constructor(commit: string, cause: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    super(`Frame at ${commit} was rejected: ${detail}`, { cause });
    this.name = "FrameParseError";
    this.commit = commit;
  }
}

function validCalendarDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(`${value}T`);
}

function fulltext(value: string): JsonObject {
  return { "@value": value, "@type": "@fulltext" };
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  throw new Error("Cannot canonicalize frame evidence");
}

function parseFrameEntry(entry: string): ParsedFrameLedger {
  const heading = entry.match(/^## (\d{4}-\d{2}-\d{2}) - (.+)$/mu);
  if (heading === null) throw new Error("Frame heading must be '## YYYY-MM-DD - Title'");
  if (!validCalendarDate(heading[1])) {
    throw new Error(`Frame date '${heading[1]}' is not a calendar date`);
  }

  for (const section of [
    "Frame Shift",
    "Selection",
    "Authority",
    "Boundaries",
    "Invariants",
    "Falsifier",
  ]) {
    const pattern = new RegExp(`### ${section}\\s+([\\s\\S]*?)(?=\\n### |\\s*$)`, "u");
    const match = entry.match(pattern);
    if (match === null || match[1].trim() === "") {
      throw new Error(`Frame requires a non-empty ${section} section`);
    }
  }

  const bagSection = entry.match(/### Bags Of Keywords\s+([\s\S]*?)(?=\n### |\s*$)/u);
  if (bagSection === null) throw new Error("Frame requires a Bags Of Keywords section");
  const bagLines = bagSection[1]
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const bagPattern = /^- \*\*([^*]+):\*\* (.+?)\.?$/u;
  if (bagLines.some((line) => !bagPattern.test(line))) {
    throw new Error("Every keyword bag line must use the documented list form");
  }
  const bags = bagLines.map((line): FrameBag => {
    const match = line.match(bagPattern);
    if (match === null) throw new Error("Invalid keyword bag");
    return {
      name: match[1],
      terms: match[2].split(",").map((term) => term.trim().replace(/\.$/u, "")),
    };
  });
  if (bags.length < 2 || bags.length > 3) {
    throw new Error("Frame requires two or three keyword bags");
  }
  const bagNames = bags.map((bag) => bag.name.toLocaleLowerCase("en-US"));
  if (new Set(bagNames).size !== bagNames.length) {
    throw new Error("Frame keyword bag names must be unique");
  }
  const termNames = bags.flatMap((bag) => bag.terms).map((term) => term.toLocaleLowerCase("en-US"));
  if (new Set(termNames).size !== termNames.length) {
    throw new Error("Frame keyword terms must be unique ignoring case");
  }
  for (const bag of bags) {
    if (bag.terms.length < 3 || bag.terms.length > 5) {
      throw new Error(`Bag '${bag.name}' requires three to five terms`);
    }
    for (const term of [bag.name, ...bag.terms]) {
      if (!/^[A-Za-z]+$/u.test(term)) {
        throw new Error(`Keyword '${term}' must be one atomic alphabetic term`);
      }
    }
  }

  const relationSection = entry.match(/### Relations\s+([\s\S]*?)(?=\n### |\s*$)/u);
  const relationLines =
    relationSection === null
      ? []
      : relationSection[1]
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
  const relationPattern = /^- ([A-Za-z]+) ([A-Za-z]+) ([A-Za-z]+)\.$/u;
  if (relationLines.some((line) => !relationPattern.test(line))) {
    throw new Error("Frame relations must be atomic subject-predicate-object triples");
  }
  const relations = relationLines.map((line): FrameRelation => {
    const match = line.match(relationPattern);
    if (match === null) throw new Error("Invalid frame relation");
    return { source: match[1], predicate: match[2], target: match[3] };
  });
  const bagTerms = new Set(bags.flatMap((bag) => bag.terms));
  for (const relation of relations) {
    if (!bagTerms.has(relation.source) || !bagTerms.has(relation.target)) {
      throw new Error("Frame relation subjects and objects must exactly match keyword bag terms");
    }
  }

  return {
    date: heading[1],
    title: heading[2].trim(),
    entry,
    bags,
    relations,
  };
}

/** Parse every standalone entry while retaining malformed historical evidence. */
export function parseFrameLedgerEntries(markdown: string): readonly ParsedFrameOccurrence[] {
  const ledgerHeading = /^# Working Frame Ledger[ \t]*\r?$/mu.exec(markdown);
  if (ledgerHeading === null) {
    return [opaqueHistoricalFrame(markdown, "No Working Frame Ledger heading found")];
  }
  const entryPattern = /^## [^\r\n]*$/gmu;
  const starts: number[] = [];
  for (const match of markdown.matchAll(entryPattern)) {
    if (match.index > ledgerHeading.index + ledgerHeading[0].length) starts.push(match.index);
  }
  if (starts.length === 0) {
    return [opaqueHistoricalFrame(markdown, "No prepended frame entry found")];
  }

  return starts.map((start, ordinal): ParsedFrameOccurrence => {
    const rawEnd = starts[ordinal + 1] ?? markdown.length;
    const candidate = markdown.slice(start, rawEnd);
    const trailing = candidate.match(/\s*$/u)?.[0].length ?? 0;
    const entry = candidate.slice(0, candidate.length - trailing);
    const byteStart = Buffer.byteLength(markdown.slice(0, start), "utf8");
    const byteEnd = byteStart + Buffer.byteLength(entry, "utf8");
    try {
      const frame = parseFrameEntry(entry);
      return {
        ordinal,
        byteStart,
        byteEnd,
        entry,
        contentHash: evidenceHash(entry),
        valid: true,
        issues: [],
        frame,
      };
    } catch (error) {
      const issue = error instanceof Error ? error.message : String(error);
      return {
        ordinal,
        byteStart,
        byteEnd,
        entry,
        contentHash: evidenceHash(entry),
        valid: false,
        issues: [issue],
      };
    }
  });
}

function opaqueHistoricalFrame(markdown: string, issue: string): ParsedFrameOccurrence {
  const trailing = markdown.match(/\s*$/u)?.[0].length ?? 0;
  const entry = markdown.slice(0, markdown.length - trailing);
  return {
    ordinal: 0,
    byteStart: 0,
    byteEnd: Buffer.byteLength(entry, "utf8"),
    entry,
    contentHash: evidenceHash(entry),
    valid: false,
    issues: [issue],
  };
}

/** Retain the legacy API: return only the newest conforming entry. */
export function parseFrameLedger(markdown: string): ParsedFrameLedger {
  const current = parseFrameLedgerEntries(markdown)[0];
  if (current?.frame === undefined) {
    throw new Error(current?.issues[0] ?? "No prepended frame entry found");
  }
  return current.frame;
}

function assessmentProjection(
  definition: InquiryDefinition,
  occurrence: ParsedFrameOccurrence
): FrameAssessmentProjection {
  const contentId = frameContentIri(definition, occurrence.contentHash);
  const result = {
    valid: occurrence.valid,
    issues: occurrence.issues,
    ...(occurrence.frame === undefined
      ? {}
      : {
          date: occurrence.frame.date,
          title: occurrence.frame.title,
          bags: occurrence.frame.bags,
          relations: occurrence.frame.relations,
        }),
  };
  const assessmentId = inquiryIri(
    definition,
    "frame:assessment",
    evidenceHash(`${contentId}\0${FRAME_PARSER_VERSION}\0${canonicalJson(result)}`)
  );
  const termId = (term: string) =>
    inquiryIri(
      definition,
      "frame:term",
      evidenceHash(`${assessmentId}\0${term.toLocaleLowerCase("en-US")}`)
    );
  const bags = (occurrence.frame?.bags ?? []).map(
    (bag, ordinal): JsonObject => ({
      "@id": inquiryIri(
        definition,
        "frame:bag",
        evidenceHash(`${assessmentId}\0${ordinal}\0${bag.name}\0${bag.terms.join("\0")}`)
      ),
      "@type": "frame:Bag",
      "frame:schemaVersion": FRAME_SCHEMA_VERSION,
      "frame:assessment": { "@id": assessmentId },
      "frame:ordinal": ordinal,
      "frame:name": bag.name,
      "frame:term": bag.terms,
      "frame:member": bag.terms.map((term) => ({ "@id": termId(term) })),
    })
  );
  const terms = [...new Set((occurrence.frame?.bags ?? []).flatMap((bag) => bag.terms))].map(
    (term): JsonObject => ({
      "@id": termId(term),
      "@type": "frame:Term",
      "frame:schemaVersion": FRAME_SCHEMA_VERSION,
      "frame:assessment": { "@id": assessmentId },
      "frame:name": term,
    })
  );
  const relations = (occurrence.frame?.relations ?? []).map(
    (relation, ordinal): JsonObject => ({
      "@id": inquiryIri(
        definition,
        "frame:relation",
        evidenceHash(
          `${assessmentId}\0${ordinal}\0${relation.source}\0${relation.predicate}\0${relation.target}`
        )
      ),
      "@type": "frame:Relation",
      "frame:schemaVersion": FRAME_SCHEMA_VERSION,
      "frame:assessment": { "@id": assessmentId },
      "frame:ordinal": ordinal,
      "frame:sourceTerm": { "@id": termId(relation.source) },
      "frame:predicate": relation.predicate,
      "frame:targetTerm": { "@id": termId(relation.target) },
    })
  );
  const content: JsonObject = {
    "@id": contentId,
    "@type": "frame:Content",
    "frame:schemaVersion": FRAME_SCHEMA_VERSION,
    "frame:body": fulltext(occurrence.entry),
    "frame:contentHash": occurrence.contentHash,
    "frame:byteLength": Buffer.byteLength(occurrence.entry, "utf8"),
  };
  const assessment: JsonObject = {
    "@id": assessmentId,
    "@type": "frame:Assessment",
    "frame:schemaVersion": FRAME_SCHEMA_VERSION,
    "frame:parserVersion": FRAME_PARSER_VERSION,
    "frame:content": { "@id": contentId },
    "frame:valid": occurrence.valid,
    ...(occurrence.issues.length === 0 ? {} : { "frame:issue": occurrence.issues }),
    ...(occurrence.frame === undefined
      ? {}
      : {
          "frame:title": occurrence.frame.title,
          "frame:date": { "@value": occurrence.frame.date, "@type": "xsd:date" },
          "frame:bag": bags.map((bag) => ({ "@id": bag["@id"] as string })),
          "frame:relation": relations.map((relation) => ({
            "@id": relation["@id"] as string,
          })),
        }),
  };
  const nodes = [content, assessment, ...bags, ...terms, ...relations];
  return {
    id: assessmentId,
    nodes,
    memberIds: nodes.map((node) => String(node["@id"])),
  };
}

function frameContentIri(definition: InquiryDefinition, contentHash: string): string {
  return inquiryIri(
    definition,
    "frame:content",
    evidenceHash(`${FRAME_CONTENT_IDENTITY_VERSION}\0${contentHash}`)
  );
}

function rightBiasedLcs(
  parent: readonly ParsedFrameOccurrence[],
  child: readonly ParsedFrameOccurrence[]
): readonly (readonly [number, number])[] {
  const lengths = Array.from({ length: parent.length + 1 }, () =>
    Array<number>(child.length + 1).fill(0)
  );
  for (let parentIndex = parent.length - 1; parentIndex >= 0; parentIndex -= 1) {
    for (let childIndex = child.length - 1; childIndex >= 0; childIndex -= 1) {
      lengths[parentIndex][childIndex] =
        parent[parentIndex].entry === child[childIndex].entry
          ? 1 + lengths[parentIndex + 1][childIndex + 1]
          : Math.max(lengths[parentIndex + 1][childIndex], lengths[parentIndex][childIndex + 1]);
    }
  }

  const matches: Array<readonly [number, number]> = [];
  let parentIndex = 0;
  let childIndex = 0;
  while (parentIndex < parent.length && childIndex < child.length) {
    const target = lengths[parentIndex][childIndex];
    if (target === 0) break;
    let selected: readonly [number, number] | undefined;
    for (let candidateChild = child.length - 1; candidateChild >= childIndex; candidateChild -= 1) {
      for (
        let candidateParent = parent.length - 1;
        candidateParent >= parentIndex;
        candidateParent -= 1
      ) {
        if (
          parent[candidateParent].entry === child[candidateChild].entry &&
          1 + lengths[candidateParent + 1][candidateChild + 1] === target
        ) {
          selected = [candidateParent, candidateChild];
          break;
        }
      }
      if (selected !== undefined) break;
    }
    if (selected === undefined) break;
    matches.push(selected);
    parentIndex = selected[0] + 1;
    childIndex = selected[1] + 1;
  }
  return matches;
}

function alignOccurrences(
  parent: readonly ParsedFrameOccurrence[],
  child: readonly ParsedFrameOccurrence[]
): Alignment {
  const suffixOffset = child.length - parent.length;
  const conforming =
    suffixOffset >= 0 &&
    parent.every((entry, index) => entry.entry === child[index + suffixOffset].entry);
  const matches = conforming
    ? parent.map((_, index) => [index, index + suffixOffset] as const)
    : rightBiasedLcs(parent, child);
  const matchedParents = new Set(matches.map(([parentIndex]) => parentIndex));
  const matchedChildren = new Set(matches.map(([, childIndex]) => childIndex));
  return {
    conforming,
    matches,
    added: child.map((_, index) => index).filter((index) => !matchedChildren.has(index)),
    removed: parent.map((_, index) => index).filter((index) => !matchedParents.has(index)),
  };
}

function frameBlob(git: GitRunner, commit: string, path: string): string | undefined {
  try {
    const blob = git.text(["rev-parse", "--verify", `${commit}:${path}`]).trim();
    return assertGitObjectId(blob, `frame blob at ${commit}`);
  } catch {
    return undefined;
  }
}

function readFrameBlob(git: GitRunner, commit: string, path: string): string {
  const bytes = git.bytes(["show", `${commit}:${path}`]);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    throw new FrameParseError(commit, error);
  }
}

function validateHistoryPlan(
  definition: InquiryDefinition,
  plan: HistoryIntakePlan,
  generation: string
): void {
  if (
    plan.definitionId !== definition.id ||
    plan.ledger !== definition.ledger ||
    plan.namespace !== definition.namespace
  ) {
    throw new Error("Frame history plan does not belong to this inquiry definition");
  }
  if (plan.generationIri !== generation) {
    throw new Error("Frame history plan does not match the supplied history generation");
  }
  const commits = new Set(plan.commits.map((commit) => commit.sha));
  if (commits.size !== plan.commits.length) throw new Error("Frame history plan repeats a commit");
  for (const commit of plan.commits) {
    for (const parent of commit.parents) {
      if (!commits.has(parent)) {
        throw new Error(`Frame history plan is missing parent ${parent} of ${commit.sha}`);
      }
    }
  }
}

function assertPlanMatchesGit(git: GitRunner, plan: HistoryIntakePlan): void {
  const format = "%x1e%H%x00%P%x00%cI";
  const output = git.text(["log", "--stdin", "--no-walk=unsorted", `--format=${format}`], {
    input: `${plan.commits.map((commit) => commit.sha).join("\n")}\n`,
  });
  const facts = new Map(
    output
      .split("\x1e")
      .filter(Boolean)
      .map((record) => {
        const [sha, parents = "", committedAt = ""] = record.replace(/^\n/u, "").trim().split("\0");
        return [sha, { committedAt, parents: parents === "" ? [] : parents.split(" ") }] as const;
      })
  );
  if (facts.size !== plan.commits.length) {
    throw new Error("Frame history plan does not match the exact Git commit corpus");
  }
  for (const commit of plan.commits) {
    const fact = facts.get(commit.sha);
    if (
      fact === undefined ||
      fact.committedAt !== commit.committedAt ||
      JSON.stringify(fact.parents) !== JSON.stringify(commit.parents)
    ) {
      throw new Error(`Frame history plan contradicts exact Git facts for ${commit.sha}`);
    }
  }
}

async function assertExactHistoryPlan(
  client: Pick<FlureeClient, "query" | "ledger">,
  definition: InquiryDefinition,
  plan: HistoryIntakePlan
): Promise<void> {
  const response = await client.query({
    "@context": contextFor(definition),
    from: definition.ledger,
    select: ["?sha"],
    where: [
      {
        "@id": plan.generationIri,
        "@type": "git:HistoryGeneration",
        "git:corpusHash": plan.corpusHash,
        "git:commitCount": plan.commits.length,
        "git:complete": true,
      },
      {
        "@id": "?commit",
        "@type": "git:Commit",
        "git:sha": "?sha",
        "git:observedIn": { "@id": plan.generationIri },
      },
    ],
    reasoning: "none",
  });
  const actual = new Set(
    responseRows(response)
      .map((row) => literalValue(rowValue(row, "sha", 0)))
      .filter((value): value is string => typeof value === "string")
  );
  const expected = new Set(plan.commits.map((commit) => commit.sha));
  if (actual.size !== expected.size || [...expected].some((sha) => !actual.has(sha))) {
    throw new Error("Frame history plan does not match the exact complete history evidence");
  }
}

async function historyFrameChangeCommits(
  client: Pick<FlureeClient, "query">,
  definition: InquiryDefinition,
  plan: HistoryIntakePlan
): Promise<ReadonlySet<string>> {
  const commits = new Set<string>();
  for (const pathPredicate of ["git:path", "git:oldPath"] as const) {
    const response = await client.query({
      "@context": contextFor(definition),
      from: definition.ledger,
      select: ["?sha"],
      where: [
        {
          "@id": plan.generationIri,
          "@type": "git:HistoryGeneration",
          "git:complete": true,
        },
        {
          "@id": "?commit",
          "@type": "git:Commit",
          "git:sha": "?sha",
          "git:observedIn": { "@id": plan.generationIri },
        },
        {
          "@id": "?change",
          "@type": "git:Change",
          "git:commit": { "@id": "?commit" },
          [pathPredicate]: definition.frame.path,
        },
      ],
      reasoning: "none",
    });
    for (const row of responseRows(response)) {
      const sha = literalValue(rowValue(row, "sha", 0));
      if (typeof sha === "string") commits.add(assertGitObjectId(sha, "frame change commit"));
    }
  }
  const admitted = new Set(plan.commits.map((commit) => commit.sha));
  for (const commit of commits) {
    if (!admitted.has(commit)) {
      throw new Error(
        `Frame change evidence names commit ${commit} outside the exact history plan`
      );
    }
  }
  return commits;
}

function attestationIdentity(
  definition: InquiryDefinition,
  path: string,
  commit: string,
  blob: string,
  occurrence: ParsedFrameOccurrence,
  assessment: string
): string {
  return inquiryIri(
    definition,
    "frame:lineage-attestation",
    evidenceHash(
      [
        definition.id,
        path,
        commit,
        blob,
        occurrence.ordinal,
        occurrence.contentHash,
        assessment,
      ].join("\0")
    )
  );
}

function uniqueNodes(nodes: readonly JsonObject[]): readonly JsonObject[] {
  const byId = new Map<string, JsonObject>();
  for (const node of nodes) {
    const id = node["@id"];
    if (typeof id !== "string") throw new Error("Frame member node requires an identity");
    const existing = byId.get(id);
    if (existing !== undefined && canonicalJson(existing) !== canonicalJson(node)) {
      throw new Error(`Frame member identity '${id}' owns contradictory facts`);
    }
    byId.set(id, node);
  }
  return [...byId.values()];
}

function memberKind(node: JsonObject): string {
  const type = node["@type"];
  if (typeof type !== "string") throw new Error("Frame member node requires one RDF class");
  return type;
}

const FRAME_BOUNDARY_BATCH_SIZE = 100;

function directIri(value: unknown, label: string): string {
  const candidate = literalValue(value);
  if (typeof candidate !== "string" || candidate.startsWith("_:")) {
    throw new Error(`${label} is not a direct IRI`);
  }
  return candidate;
}

async function frameIntakeT(
  client: Pick<FlureeClient, "query">,
  definition: InquiryDefinition,
  job: "frame-generation-intake" | "frame-observation-intake",
  predicate: "meta:generation" | "meta:observation",
  identity: string
): Promise<number> {
  const response = await client.query({
    "@context": contextFor(definition),
    from: transactionMetadataSource(definition.ledger),
    select: ["?transaction", "?t"],
    where: {
      "@id": "?transaction",
      "meta:job": job,
      [predicate]: { "@id": identity },
      "f:t": "?t",
    },
    orderBy: [["asc", "?t"]],
    limit: 2,
    reasoning: "none",
  });
  const rows = responseRows(response);
  if (rows.length !== 1) {
    throw new Error(
      `${identity} requires exactly one immutable ${job.replace("-intake", "")} transaction`
    );
  }
  const rawT = literalValue(rowValue(rows[0], "t", 1));
  const t =
    typeof rawT === "number"
      ? rawT
      : typeof rawT === "string" && rawT.trim() !== ""
        ? Number(rawT)
        : Number.NaN;
  if (!Number.isSafeInteger(t) || t < 0) throw new Error(`${identity} has invalid intake time`);
  return t;
}

async function frameSubjectTriples(
  client: Pick<FlureeClient, "query">,
  from: string,
  subjects: readonly string[]
): Promise<readonly string[]> {
  const triples = new Set<string>();
  for (let offset = 0; offset < subjects.length; offset += FRAME_BOUNDARY_BATCH_SIZE) {
    const batch = subjects.slice(offset, offset + FRAME_BOUNDARY_BATCH_SIZE);
    const expansions = await constantSubjectExpansions(
      client,
      from,
      batch,
      "frame subject expansion"
    );
    for (const [index, expansion] of expansions.entries()) {
      for (const triple of canonicalProjectionTriples(
        expansion,
        batch[index],
        "Frame subject expansion"
      )) {
        triples.add(triple);
      }
    }
  }
  return [...triples].sort();
}

async function frameGenerationBoundary(
  client: Pick<FlureeClient, "query">,
  definition: InquiryDefinition,
  generation: string,
  from: string
): Promise<{
  readonly memberCount: number;
  readonly membershipDigest: string;
  readonly members: readonly string[];
  readonly reconstructionVersion: string;
  readonly triples: readonly string[];
}> {
  const [expansion] = await constantSubjectExpansions(
    client,
    from,
    [generation],
    "frame generation expansion"
  );
  const rawMembers = expansion[`${namespacesFor(definition).frame}member`];
  const values = Array.isArray(rawMembers) ? rawMembers : [rawMembers];
  if (rawMembers === undefined || values.length === 0) {
    throw new Error(`Frame generation '${generation}' has no exact members at '${from}'`);
  }
  const members = [...new Set(values.map((value) => directIri(value, "Frame member")))].sort();
  const frame = namespacesFor(definition).frame;
  const rawMemberCount = literalValue(expansion[`${frame}memberCount`]);
  const memberCount =
    typeof rawMemberCount === "number"
      ? rawMemberCount
      : typeof rawMemberCount === "string"
        ? Number(rawMemberCount)
        : Number.NaN;
  const membershipDigest = literalValue(expansion[`${frame}membershipDigest`]);
  const reconstructionVersion = literalValue(expansion[`${frame}reconstructionVersion`]);
  if (
    !Number.isSafeInteger(memberCount) ||
    memberCount < 1 ||
    typeof membershipDigest !== "string" ||
    typeof reconstructionVersion !== "string"
  ) {
    throw new Error(
      `Frame generation '${generation}' has invalid membership controls at '${from}'`
    );
  }
  return {
    memberCount,
    membershipDigest,
    members,
    reconstructionVersion,
    triples: canonicalProjectionTriples(expansion, generation, "Frame generation expansion"),
  };
}

async function frameMemberBoundary(
  client: Pick<FlureeClient, "query">,
  definition: InquiryDefinition,
  from: string,
  subjects: readonly string[]
): Promise<{ readonly rows: readonly string[]; readonly triples: readonly string[] }> {
  const rows: string[] = [];
  const triples = new Set<string>();
  const frame = namespacesFor(definition).frame;
  for (let offset = 0; offset < subjects.length; offset += FRAME_BOUNDARY_BATCH_SIZE) {
    const batch = subjects.slice(offset, offset + FRAME_BOUNDARY_BATCH_SIZE);
    const expansions = await constantSubjectExpansions(
      client,
      from,
      batch,
      "frame member expansion"
    );
    for (const [index, expansion] of expansions.entries()) {
      const types = Array.isArray(expansion["@type"]) ? expansion["@type"] : [expansion["@type"]];
      if (types.length !== 1 || typeof types[0] !== "string") {
        throw new Error(`Frame member '${batch[index]}' must have exactly one RDF class`);
      }
      const type = types[0].startsWith(frame) ? `frame:${types[0].slice(frame.length)}` : types[0];
      rows.push(`${type} ${batch[index]}`);
      for (const triple of canonicalProjectionTriples(
        expansion,
        batch[index],
        "Frame member expansion"
      )) {
        triples.add(triple);
      }
    }
  }
  return {
    rows: rows.sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right))),
    triples: [...triples].sort(),
  };
}

/** Prove that generation membership and every owned member fact remain immutable. */
export async function assertFrameGenerationImmutable(options: {
  readonly client: Pick<FlureeClient, "ledger" | "query">;
  readonly definition: InquiryDefinition;
  readonly generation: string;
  readonly snapshot?: string;
}): Promise<void> {
  const { client, definition, generation } = options;
  if (client.ledger !== definition.ledger) {
    throw new Error("Frame generation client and inquiry ledger must match");
  }
  const intakeT = await frameIntakeT(
    client,
    definition,
    "frame-generation-intake",
    "meta:generation",
    generation
  );
  const intake = `${definition.ledger}@t:${String(intakeT)}`;
  const snapshot = options.snapshot ?? definition.ledger;
  const before = await frameGenerationBoundary(client, definition, generation, intake);
  const after = await frameGenerationBoundary(client, definition, generation, snapshot);
  if (JSON.stringify(before.members) !== JSON.stringify(after.members)) {
    throw new Error(`Frame generation '${generation}' membership changed after intake`);
  }
  const [beforeMembers, afterMembers] = await Promise.all([
    frameMemberBoundary(client, definition, intake, before.members),
    frameMemberBoundary(client, definition, snapshot, after.members),
  ]);
  for (const [boundary, memberBoundary] of [
    [before, beforeMembers],
    [after, afterMembers],
  ] as const) {
    const digest = evidenceHash(
      `${boundary.reconstructionVersion}\n${memberBoundary.rows.map((row) => `${row}\n`).join("")}`
    );
    if (boundary.memberCount !== boundary.members.length || boundary.membershipDigest !== digest) {
      throw new Error(`Frame generation '${generation}' membership proof is inconsistent`);
    }
  }
  if (
    JSON.stringify(before.triples) !== JSON.stringify(after.triples) ||
    JSON.stringify(beforeMembers.triples) !== JSON.stringify(afterMembers.triples)
  ) {
    throw new Error(`Frame generation '${generation}' content changed after intake`);
  }
}

/** Prove that one branch/session observation retains its exact intake boundary. */
export async function assertFrameObservationImmutable(options: {
  readonly client: Pick<FlureeClient, "ledger" | "query">;
  readonly definition: InquiryDefinition;
  readonly observation: string;
  readonly snapshot?: string;
}): Promise<void> {
  const { client, definition, observation } = options;
  if (client.ledger !== definition.ledger) {
    throw new Error("Frame observation client and inquiry ledger must match");
  }
  const intakeT = await frameIntakeT(
    client,
    definition,
    "frame-observation-intake",
    "meta:observation",
    observation
  );
  const [before, after] = await Promise.all([
    frameSubjectTriples(client, `${definition.ledger}@t:${String(intakeT)}`, [observation]),
    frameSubjectTriples(client, options.snapshot ?? definition.ledger, [observation]),
  ]);
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    throw new Error(`Frame observation '${observation}' changed after intake`);
  }
}

function expandFrameTerm(definition: InquiryDefinition, value: string, label: string): string {
  if (value === "@fulltext") return `${namespacesFor(definition).f}fullText`;
  const separator = value.indexOf(":");
  if (separator < 1) throw new Error(`${label} must be an absolute or compact IRI`);
  const prefix = value.slice(0, separator);
  const namespace = contextFor(definition)[prefix];
  const expanded = namespace === undefined ? value : `${namespace}${value.slice(separator + 1)}`;
  if (expanded.startsWith("_:")) throw new Error(`${label} must not be a blank node`);
  return expanded;
}

function expandExpectedFrameValue(
  definition: InquiryDefinition,
  value: unknown,
  label: string
): unknown {
  if (Array.isArray(value)) {
    return value.map((entry, index) =>
      expandExpectedFrameValue(definition, entry, `${label}[${String(index)}]`)
    );
  }
  if (value === null || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  if (typeof record["@id"] === "string") {
    if (Object.keys(record).length !== 1) {
      throw new Error(`${label} must be one direct IRI reference`);
    }
    return { "@id": expandFrameTerm(definition, record["@id"], `${label} @id`) };
  }
  if (!("@value" in record)) throw new Error(`${label} must be one direct RDF value`);
  return {
    "@value": record["@value"],
    ...(typeof record["@type"] === "string"
      ? { "@type": expandFrameTerm(definition, record["@type"], `${label} @type`) }
      : {}),
    ...(typeof record["@language"] === "string" ? { "@language": record["@language"] } : {}),
  };
}

function expectedFrameExpansion(
  definition: InquiryDefinition,
  node: JsonObject
): Record<string, unknown> {
  const id = node["@id"];
  if (typeof id !== "string") throw new Error("Expected frame node requires an @id");
  const expansion: Record<string, unknown> = {
    "@id": expandFrameTerm(definition, id, "Expected frame node @id"),
  };
  for (const [rawPredicate, value] of Object.entries(node)) {
    if (rawPredicate === "@id") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (rawPredicate === "@type") {
      const values = Array.isArray(value) ? value : [value];
      expansion["@type"] = values.map((entry) => {
        if (typeof entry !== "string") throw new Error("Expected frame @type must be an IRI");
        return expandFrameTerm(definition, entry, "Expected frame @type");
      });
      continue;
    }
    const predicate = expandFrameTerm(definition, rawPredicate, "Expected frame predicate");
    expansion[predicate] = expandExpectedFrameValue(
      definition,
      value,
      `Expected frame predicate '${rawPredicate}'`
    );
  }
  return expansion;
}

async function assertExpectedFrameSubjects(
  client: Pick<FlureeClient, "query">,
  definition: InquiryDefinition,
  nodes: readonly JsonObject[]
): Promise<void> {
  for (let offset = 0; offset < nodes.length; offset += FRAME_BOUNDARY_BATCH_SIZE) {
    const batch = nodes.slice(offset, offset + FRAME_BOUNDARY_BATCH_SIZE);
    const subjects = batch.map((node) => String(node["@id"]));
    const actual = await constantSubjectExpansions(
      client,
      definition.ledger,
      subjects,
      "frame receipt expansion"
    );
    for (const [index, node] of batch.entries()) {
      assertExpectedFrameSubject(definition, node, actual[index]);
    }
  }
}

function assertExpectedFrameSubject(
  definition: InquiryDefinition,
  node: JsonObject,
  actual: Record<string, unknown>
): void {
  const subject = String(node["@id"]);
  const expected = canonicalProjectionTriples(
    expectedFrameExpansion(definition, node),
    subject,
    "Expected frame receipt"
  );
  const observed = canonicalProjectionTriples(actual, subject, "Observed frame receipt");
  if (JSON.stringify(observed) !== JSON.stringify(expected)) {
    throw new Error(`Frame receipt '${subject}' contradicts its content identity`);
  }
}

async function assertExpectedOrAbsentFrameSubjects(
  client: Pick<FlureeClient, "query">,
  definition: InquiryDefinition,
  nodes: readonly JsonObject[]
): Promise<void> {
  for (let offset = 0; offset < nodes.length; offset += FRAME_BOUNDARY_BATCH_SIZE) {
    const batch = nodes.slice(offset, offset + FRAME_BOUNDARY_BATCH_SIZE);
    const subjects = batch.map((node) => String(node["@id"]));
    const actual = await constantSubjectExpansions(
      client,
      definition.ledger,
      subjects,
      "frame reusable-member expansion"
    );
    for (const [index, node] of batch.entries()) {
      if (Object.keys(actual[index]).every((key) => key === "@id")) continue;
      assertExpectedFrameSubject(definition, node, actual[index]);
    }
  }
}

async function assertFrameSubjectFresh(
  client: Pick<FlureeClient, "query">,
  definition: InquiryDefinition,
  identity: string
): Promise<void> {
  const [actual] = await constantSubjectExpansions(
    client,
    definition.ledger,
    [identity],
    "frame fresh-subject expansion"
  );
  if (Object.keys(actual).some((key) => key !== "@id")) {
    throw new Error(`Frame receipt '${identity}' already exists without its owning receipt`);
  }
}

async function exactFrameReceiptPresent(
  client: Pick<FlureeClient, "query">,
  definition: InquiryDefinition,
  identity: string,
  expected: readonly JsonObject[]
): Promise<boolean> {
  const [expansion] = await constantSubjectExpansions(
    client,
    definition.ledger,
    [identity],
    "frame receipt collision check"
  );
  if (Object.keys(expansion).some((key) => key !== "@id")) {
    await assertExpectedFrameSubjects(client, definition, expected);
    return true;
  }
  return false;
}

function classifyChange(
  root: boolean,
  merge: boolean,
  alignment: Alignment,
  childCount: number
): string {
  if (root) return "root";
  if (alignment.added.length === 0 && alignment.removed.length === 0) return "unchanged";
  if (childCount === 0) return "removal";
  if (merge) return "merge-selection";
  if (alignment.conforming) return "prepend";
  return "mutation";
}

/** Ingest a complete historical frame corpus without authoring or editing the frame. */
export async function intakeFrame(options: IntakeFrameOptions): Promise<FrameIntakeReport> {
  const { definition, client } = options;
  if (client.ledger !== definition.ledger) {
    throw new Error(
      `Fluree client ledger '${client.ledger}' does not match definition '${definition.ledger}'`
    );
  }
  const git = options.git ?? createGitRunner(options.root);
  const plan = options.historyPlan ?? planHistoryIntake({ definition, root: options.root, git });
  validateHistoryPlan(definition, plan, options.historyGeneration);
  assertPlanMatchesGit(git, plan);

  const sessionParts = [options.session, options.sessionGeneration, options.sessionSource];
  if (
    sessionParts.some((value) => value !== undefined) &&
    sessionParts.some((value) => value === undefined)
  ) {
    throw new Error(
      "Frame session association requires session, sessionGeneration, and sessionSource"
    );
  }
  const sessionPrefix = `${definition.namespace}id/session/`;
  if (
    options.session !== undefined &&
    (!options.session.startsWith(sessionPrefix) || options.session.length === sessionPrefix.length)
  ) {
    throw new Error("Frame session must be an identity from this inquiry");
  }
  const sessionGenerationPrefix = `${definition.namespace}id/session-generation/`;
  if (
    options.sessionGeneration !== undefined &&
    (!options.sessionGeneration.startsWith(sessionGenerationPrefix) ||
      options.sessionGeneration.length === sessionGenerationPrefix.length)
  ) {
    throw new Error("Frame sessionGeneration must be an identity from this inquiry");
  }

  const observationCommit = assertGitObjectId(
    git.text(["rev-parse", `${options.atCommit}^{commit}`]).trim(),
    "frame observation commit"
  );
  const commitsBySha = new Map(plan.commits.map((commit) => [commit.sha, commit]));
  if (!commitsBySha.has(observationCommit)) {
    throw new Error("Frame observation commit is not present in the supplied history plan");
  }
  await assertHistoryObservation({
    client,
    commit: observationCommit,
    definition,
    generation: options.historyGeneration,
  });
  await assertExactHistoryPlan(client, definition, plan);
  const changedByHistory = await historyFrameChangeCommits(client, definition, plan);

  if (options.sessionGeneration !== undefined) {
    const association = responseRows(
      await client.query({
        "@context": contextFor(definition),
        from: definition.ledger,
        select: ["?session", "?source", "?commit"],
        where: {
          "@id": options.sessionGeneration,
          "@type": "session:Generation",
          "session:session": { "@id": "?session" },
          "session:source": "?source",
          "session:complete": true,
          "session:observedCommit": { "@id": "?commit" },
        },
        limit: 1,
        reasoning: "none",
      })
    )[0];
    const associatedSession = expandInquiryIri(definition, rowValue(association, "session", 0));
    const commitIri = expandInquiryIri(definition, rowValue(association, "commit", 2));
    const commitPrefix = inquiryIri(definition, "git:commit", "");
    if (
      associatedSession !== options.session ||
      literalValue(rowValue(association, "source", 1)) !== options.sessionSource ||
      typeof commitIri !== "string" ||
      !commitIri.startsWith(commitPrefix)
    ) {
      throw new Error(
        "Frame sessionGeneration is not a complete generation for this session and source"
      );
    }
    const sessionCommit = assertGitObjectId(
      decodeURIComponent(commitIri.slice(commitPrefix.length)),
      "frame session observation commit"
    );
    if (sessionCommit !== observationCommit) {
      throw new Error("Frame and session must be observed at the same exact commit");
    }
  }

  const blobByCommit = new Map<string, string | undefined>();
  const parsedByBlob = new Map<string, readonly ParsedFrameOccurrence[]>();
  const assessmentByContent = new Map<string, FrameAssessmentProjection>();
  const states = new Map<string, CommitFrameState>();
  const memberNodes: JsonObject[] = [];
  const attestationSources = new Map<string, AttestationSource>();
  const changeNodes: JsonObject[] = [];

  const blobForCommit = (commit: string): string | undefined => {
    if (blobByCommit.has(commit)) return blobByCommit.get(commit);
    const blob = frameBlob(git, commit, definition.frame.path);
    blobByCommit.set(commit, blob);
    return blob;
  };
  const entriesFor = (commit: string, blob: string): readonly ParsedFrameOccurrence[] => {
    const cached = parsedByBlob.get(blob);
    if (cached !== undefined) return cached;
    const markdown = readFrameBlob(git, commit, definition.frame.path);
    let entries: readonly ParsedFrameOccurrence[];
    try {
      entries = parseFrameLedgerEntries(markdown);
    } catch (error) {
      throw new FrameParseError(commit, error);
    }
    parsedByBlob.set(blob, entries);
    for (const entry of entries) {
      if (!assessmentByContent.has(entry.contentHash)) {
        const projection = assessmentProjection(definition, entry);
        assessmentByContent.set(entry.contentHash, projection);
        memberNodes.push(...projection.nodes);
      }
    }
    return entries;
  };

  for (const commit of plan.commits) {
    const childBlob = blobForCommit(commit.sha);
    const parentStates = commit.parents.map((parent) => {
      const state = states.get(parent);
      if (state === undefined) throw new Error(`Frame reconstruction is missing parent ${parent}`);
      return state;
    });
    const changed = changedByHistory.has(commit.sha);
    const differsFromParent =
      commit.parents.length === 0
        ? childBlob !== undefined
        : parentStates.some((parent) => parent.blob !== childBlob);
    if (differsFromParent && !changed) {
      throw new Error(
        `Frame blob changes at ${commit.sha} without exact parent-relative git:Change evidence`
      );
    }
    if (!changed) {
      states.set(commit.sha, parentStates[0] ?? { occurrences: [] });
      continue;
    }

    const childEntries = childBlob === undefined ? [] : entriesFor(commit.sha, childBlob);
    const firstParent = parentStates[0] ?? { occurrences: [] };
    const firstAlignment = alignOccurrences(
      firstParent.occurrences.map((entry) => entry.occurrence),
      childEntries
    );
    const inherited = new Map(
      firstAlignment.matches.map(([parentIndex, childIndex]) => [
        childIndex,
        firstParent.occurrences[parentIndex],
      ])
    );
    const childStates = childEntries.map((occurrence): BlobOccurrenceState => {
      const prior = inherited.get(occurrence.ordinal);
      if (prior !== undefined) {
        return {
          occurrence,
          contentId: prior.contentId,
          assessmentId: prior.assessmentId,
          attestationId: prior.attestationId,
        };
      }
      if (childBlob === undefined) throw new Error("Cannot attest an absent frame blob");
      const projection = assessmentByContent.get(occurrence.contentHash);
      if (projection === undefined) throw new Error("Frame assessment projection is missing");
      const attestationId = attestationIdentity(
        definition,
        definition.frame.path,
        commit.sha,
        childBlob,
        occurrence,
        projection.id
      );
      const introductionKind =
        commit.parents.length === 0
          ? "root"
          : commit.parents.length > 1
            ? "merge-selection"
            : firstAlignment.conforming
              ? "prepend"
              : "addition";
      const attestation: JsonObject = {
        "@id": attestationId,
        "@type": "frame:LineageAttestation",
        "frame:schemaVersion": FRAME_SCHEMA_VERSION,
        "frame:path": definition.frame.path,
        "frame:source": { "@id": inquiryIri(definition, "git:commit", commit.sha) },
        "frame:sourceSha": commit.sha,
        "frame:sourceBlob": childBlob,
        "frame:entryOrdinal": occurrence.ordinal,
        "frame:byteStart": occurrence.byteStart,
        "frame:byteEnd": occurrence.byteEnd,
        "frame:content": {
          "@id": frameContentIri(definition, occurrence.contentHash),
        },
        "frame:assessment": { "@id": projection.id },
        "frame:introductionKind": introductionKind,
        "frame:sourceCommittedAt": dateTimeLiteral(commit.committedAt),
      };
      memberNodes.push(attestation);
      attestationSources.set(attestationId, { commit, blob: childBlob, occurrence });
      return {
        occurrence,
        contentId: frameContentIri(definition, occurrence.contentHash),
        assessmentId: projection.id,
        attestationId,
      };
    });
    const childState: CommitFrameState = {
      ...(childBlob === undefined ? {} : { blob: childBlob }),
      occurrences: childStates,
    };
    states.set(commit.sha, childState);

    const comparedParents = commit.parents.length === 0 ? [undefined] : commit.parents;
    for (const [parentIndex, parentSha] of comparedParents.entries()) {
      const parentState = parentSha === undefined ? { occurrences: [] } : parentStates[parentIndex];
      const alignment = alignOccurrences(
        parentState.occurrences.map((entry) => entry.occurrence),
        childEntries
      );
      const canonicalAlignment = [
        ...alignment.matches.map(([before, after]) => `match:${before}:${after}`),
        ...alignment.added.map((after) => `add:${after}`),
        ...alignment.removed.map((before) => `remove:${before}`),
      ].join("\n");
      const addedAttestations = alignment.added.map((index) => childStates[index].attestationId);
      const removedAttestations = alignment.removed.map(
        (index) => parentState.occurrences[index].attestationId
      );
      const parentIdentity = parentSha ?? "root";
      const changeId = inquiryIri(
        definition,
        "frame:change",
        evidenceHash(
          [
            FRAME_RECONSTRUCTION_VERSION,
            FRAME_PARSER_VERSION,
            commit.sha,
            parentIdentity,
            parentState.blob ?? "absent",
            childBlob ?? "absent",
            canonicalAlignment,
            addedAttestations.join("\n"),
            removedAttestations.join("\n"),
          ].join("\0")
        )
      );
      changeNodes.push({
        "@id": changeId,
        "@type": "frame:Change",
        "frame:schemaVersion": FRAME_SCHEMA_VERSION,
        "frame:reconstructionVersion": FRAME_RECONSTRUCTION_VERSION,
        "frame:commit": { "@id": inquiryIri(definition, "git:commit", commit.sha) },
        "frame:parent": {
          "@id":
            parentSha === undefined
              ? inquiryIri(definition, "git:root", "empty-tree")
              : inquiryIri(definition, "git:commit", parentSha),
        },
        ...(parentState.blob === undefined ? {} : { "frame:beforeBlob": parentState.blob }),
        ...(childBlob === undefined ? {} : { "frame:afterBlob": childBlob }),
        "frame:alignment": canonicalAlignment,
        "frame:conformingPrepend": alignment.conforming,
        "frame:changeKind": classifyChange(
          parentSha === undefined,
          commit.parents.length > 1,
          alignment,
          childEntries.length
        ),
        "frame:addedAttestation": addedAttestations.map((attestation) => ({
          "@id": attestation,
        })),
        "frame:removedAttestation": removedAttestations.map((attestation) => ({
          "@id": attestation,
        })),
      });
    }
  }

  const observationState = states.get(observationCommit);
  if (observationState?.blob === undefined || observationState.occurrences.length === 0) {
    throw new Error(`No committed frame exists at ${definition.frame.path}`);
  }
  const current = observationState.occurrences[0];
  if (current.occurrence.frame === undefined) {
    throw new FrameParseError(observationCommit, current.occurrence.issues[0]);
  }
  const source = attestationSources.get(current.attestationId);
  if (source === undefined) {
    throw new Error("Selected frame attestation is not a member of the reconstructed generation");
  }

  const members = uniqueNodes([...memberNodes, ...changeNodes]);
  const membershipRows = members
    .map((node) => `${memberKind(node)} ${String(node["@id"])}`)
    .sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
  const membershipDigest = evidenceHash(
    `${FRAME_RECONSTRUCTION_VERSION}\n${membershipRows.map((row) => `${row}\n`).join("")}`
  );
  const definitionHash = evidenceHash(JSON.stringify(definition));
  const generation = inquiryIri(
    definition,
    "frame:generation",
    evidenceHash(
      [
        definitionHash,
        "fixed-path-v1",
        definition.frame.path,
        options.historyGeneration,
        observationCommit,
        FRAME_PARSER_VERSION,
        FRAME_RECONSTRUCTION_VERSION,
        membershipDigest,
      ].join("\0")
    )
  );
  const generationNode: JsonObject = {
    "@id": generation,
    "@type": "frame:Generation",
    "frame:schemaVersion": FRAME_SCHEMA_VERSION,
    "frame:definition": definition.id,
    "frame:definitionHash": definitionHash,
    "frame:pathPolicy": "fixed-path-v1",
    "frame:path": definition.frame.path,
    "frame:historyGeneration": { "@id": options.historyGeneration },
    "frame:observedCommit": {
      "@id": inquiryIri(definition, "git:commit", observationCommit),
    },
    "frame:parserVersion": FRAME_PARSER_VERSION,
    "frame:reconstructionVersion": FRAME_RECONSTRUCTION_VERSION,
    "frame:membershipDigest": membershipDigest,
    "frame:member": members.map((node) => ({ "@id": String(node["@id"]) })),
    "frame:memberCount": members.length,
    "frame:assessmentCount": assessmentByContent.size,
    "frame:changeCount": changeNodes.length,
    "frame:currentAttestation": { "@id": current.attestationId },
    "frame:currentContent": { "@id": current.contentId },
    "frame:observedBlob": observationState.blob,
    "frame:complete": true,
  };
  const generationCompletion: JsonObject = {
    "@id": inquiryIri(definition, "frame:generation-completion", evidenceHash(generation)),
    "@type": "frame:GenerationCompletion",
    "frame:generation": { "@id": generation },
    "frame:generationKey": { "@id": generation },
  };
  const expectedGeneration = [...members, generationNode, generationCompletion];
  let generationExisting = await exactFrameReceiptPresent(
    client,
    definition,
    generation,
    expectedGeneration
  );
  if (generationExisting) {
    await assertFrameGenerationImmutable({ client, definition, generation });
  } else {
    const generationKey = `${namespacesFor(definition).frame}generationKey`;
    await assertExpectedOrAbsentFrameSubjects(client, definition, members);
    await assertFrameSubjectFresh(client, definition, String(generationCompletion["@id"]));
    try {
      await client.insert(
        [
          ...members,
          generationNode,
          generationCompletion,
          { "@id": generationKey, "f:enforceUnique": true },
        ],
        {
          context: contextFor(definition),
          metadata: {
            "f:message": `Reconstruct frame lineage at ${observationCommit}`,
            "meta:job": "frame-generation-intake",
            "meta:generation": { "@id": generation },
            "meta:gitSha": observationCommit,
          },
          opts: { uniqueProperties: [generationKey] },
        }
      );
      await assertExpectedFrameSubjects(client, definition, expectedGeneration);
      await assertFrameGenerationImmutable({ client, definition, generation });
    } catch (error) {
      if (!(await exactFrameReceiptPresent(client, definition, generation, expectedGeneration))) {
        throw error;
      }
      await assertFrameGenerationImmutable({ client, definition, generation });
      generationExisting = true;
    }
  }

  const observation = inquiryIri(
    definition,
    "frame:observation",
    evidenceHash(
      [
        generation,
        observationCommit,
        current.attestationId,
        observationState.blob,
        options.sessionGeneration ?? "standalone",
      ].join("\0")
    )
  );
  const observationNode: JsonObject = {
    "@id": observation,
    "@type": "frame:Observation",
    "frame:schemaVersion": FRAME_SCHEMA_VERSION,
    "frame:generation": { "@id": generation },
    "frame:observedCommit": {
      "@id": inquiryIri(definition, "git:commit", observationCommit),
    },
    "frame:observedBlob": observationState.blob,
    "frame:selectedAttestation": { "@id": current.attestationId },
    "frame:selectedContent": { "@id": current.contentId },
    "frame:observedAt": dateTimeLiteral(commitsBySha.get(observationCommit)?.committedAt ?? ""),
    ...(options.sessionGeneration === undefined
      ? {}
      : { "frame:sessionGeneration": { "@id": options.sessionGeneration } }),
    "frame:complete": true,
  };
  const observationCompletion: JsonObject = {
    "@id": inquiryIri(definition, "frame:observation-completion", evidenceHash(observation)),
    "@type": "frame:ObservationCompletion",
    "frame:observation": { "@id": observation },
    "frame:observationKey": { "@id": observation },
  };
  const expectedObservation = [observationNode, observationCompletion];
  let observationExisting = await exactFrameReceiptPresent(
    client,
    definition,
    observation,
    expectedObservation
  );
  if (observationExisting) {
    await assertFrameObservationImmutable({ client, definition, observation });
  } else {
    const observationKey = `${namespacesFor(definition).frame}observationKey`;
    await assertFrameSubjectFresh(client, definition, String(observationCompletion["@id"]));
    try {
      await client.insert(
        [
          observationNode,
          observationCompletion,
          { "@id": observationKey, "f:enforceUnique": true },
        ],
        {
          context: contextFor(definition),
          metadata: {
            "f:message": `Observe frame: ${current.occurrence.frame.title}`,
            "meta:job": "frame-observation-intake",
            "meta:generation": { "@id": generation },
            "meta:observation": { "@id": observation },
            "meta:gitSha": observationCommit,
          },
          opts: { uniqueProperties: [observationKey] },
        }
      );
      await assertExpectedFrameSubjects(client, definition, expectedObservation);
      await assertFrameObservationImmutable({ client, definition, observation });
    } catch (error) {
      if (!(await exactFrameReceiptPresent(client, definition, observation, expectedObservation))) {
        throw error;
      }
      await assertFrameObservationImmutable({ client, definition, observation });
      observationExisting = true;
    }
  }

  const sourceCommittedAt = new Date(source.commit.committedAt).toISOString();
  const attestedAt = new Date(commitsBySha.get(observationCommit)?.committedAt ?? "").toISOString();
  return {
    ledger: definition.ledger,
    attestation: current.attestationId,
    frame: current.occurrence.frame.title,
    observedCommit: observationCommit,
    commit: source.commit.sha,
    blob: source.blob,
    sourceCommittedAt,
    attestedAt,
    bagCount: current.occurrence.frame.bags.length,
    relationCount: current.occurrence.frame.relations.length,
    generation,
    observation,
    assessmentCount: assessmentByContent.size,
    membershipCount: members.length,
    changeCount: changeNodes.length,
    generationExisting,
    observationExisting,
    ...(options.session === undefined ? {} : { session: options.session }),
    ...(options.sessionGeneration === undefined
      ? {}
      : { sessionGeneration: options.sessionGeneration }),
    ...(options.sessionSource === undefined ? {} : { sessionSource: options.sessionSource }),
  };
}
