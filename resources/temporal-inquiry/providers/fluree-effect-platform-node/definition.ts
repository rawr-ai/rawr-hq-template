import { readFile, stat } from "node:fs/promises";
import { isAbsolute, posix, relative, resolve, sep, win32 } from "node:path";

/** The only repository opt-in definition version understood by this kernel. */
export const INQUIRY_DEFINITION_SCHEMA_VERSION = 1 as const;

/** The external Fluree runtime version proven by the temporal inquiry kernel. */
export const SUPPORTED_FLUREE_VERSION = "4.1.4" as const;

export interface InquiryRefPolicy {
  readonly version: string;
  readonly include: readonly string[];
  readonly exclude: readonly string[];
}

export interface InquiryDefinition {
  readonly schemaVersion: typeof INQUIRY_DEFINITION_SCHEMA_VERSION;
  readonly id: string;
  readonly ownerProject: string;
  /** A canonical `ledger-name:branch` ID. Unbranched inputs normalize to `:main`. */
  readonly ledger: string;
  /** An absolute namespace ending in `/` or `:`. */
  readonly namespace: string;
  readonly runtime: {
    readonly version: typeof SUPPORTED_FLUREE_VERSION;
    readonly endpoint?: string;
    readonly storage?: string;
  };
  readonly repository: {
    readonly definition: string;
    readonly pins: readonly string[];
    readonly refPolicy: InquiryRefPolicy;
  };
  readonly model: {
    readonly ontology: string;
    readonly rules: string;
    readonly shapes: string;
    readonly config: string;
    readonly facts: readonly string[];
    readonly materialization?: string;
  };
  readonly adapters: {
    readonly projection?: string;
    readonly session?: string;
    readonly queries: string;
  };
  readonly frame: {
    readonly path: string;
  };
}

export interface ValidateInquiryDefinitionOptions {
  readonly root?: string;
}

/** A precise failure at the untrusted repository-definition boundary. */
export class InquiryDefinitionError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(`${field}: ${message}`);
    this.name = "InquiryDefinitionError";
    this.field = field;
  }
}

type UnknownRecord = Record<string, unknown>;

const ID_PATTERN = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/u;
const LEDGER_PATTERN =
  /^[A-Za-z0-9](?:[A-Za-z0-9._/-]*[A-Za-z0-9])?(?::[A-Za-z0-9](?:[A-Za-z0-9._/-]*[A-Za-z0-9])?)?$/u;

function record(value: unknown, field: string): UnknownRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new InquiryDefinitionError(field, "must be an object");
  }
  return value as UnknownRecord;
}

function exactKeys(
  value: UnknownRecord,
  field: string,
  required: readonly string[],
  optional: readonly string[] = []
): void {
  const allowed = new Set([...required, ...optional]);
  const missing = required.filter((key) => !(key in value));
  if (missing.length > 0) {
    throw new InquiryDefinitionError(field, `is missing ${missing.join(", ")}`);
  }
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length > 0) {
    throw new InquiryDefinitionError(field, `contains unknown field(s): ${unknown.join(", ")}`);
  }
}

function string(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new InquiryDefinitionError(field, "must be a non-empty string");
  }
  if (value !== value.trim()) {
    throw new InquiryDefinitionError(field, "must not contain surrounding whitespace");
  }
  return value;
}

function identifier(value: unknown, field: string): string {
  const parsed = string(value, field);
  if (!ID_PATTERN.test(parsed)) {
    throw new InquiryDefinitionError(
      field,
      "must contain only lower-case letters, digits, dots, underscores, or hyphens"
    );
  }
  return parsed;
}

function stringList(value: unknown, field: string, allowEmpty = false): readonly string[] {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new InquiryDefinitionError(
      field,
      allowEmpty ? "must be an array" : "must be a non-empty array"
    );
  }
  const values = value.map((entry, index) => string(entry, `${field}[${index}]`));
  if (new Set(values).size !== values.length) {
    throw new InquiryDefinitionError(field, "must not contain duplicate values");
  }
  return values;
}

function repoPath(value: unknown, field: string, root?: string): string {
  const parsed = string(value, field);
  if (
    parsed.includes("\\") ||
    parsed.includes("\0") ||
    isAbsolute(parsed) ||
    win32.isAbsolute(parsed)
  ) {
    throw new InquiryDefinitionError(field, "must be a repository-relative POSIX path");
  }
  const normalized = posix.normalize(parsed);
  if (
    normalized !== parsed ||
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../")
  ) {
    throw new InquiryDefinitionError(field, "must not escape or normalize outside the repository");
  }
  if (root !== undefined) {
    const absoluteRoot = resolve(root);
    const absolutePath = resolve(absoluteRoot, parsed);
    const fromRoot = relative(absoluteRoot, absolutePath);
    if (fromRoot === ".." || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
      throw new InquiryDefinitionError(field, "resolves outside the repository root");
    }
  }
  return parsed;
}

function namespace(value: unknown): string {
  const parsed = string(value, "namespace");
  if (!(parsed.endsWith("/") || parsed.endsWith(":"))) {
    throw new InquiryDefinitionError("namespace", "must end in '/' or ':'");
  }
  try {
    const url = new URL(parsed);
    if (!["http:", "https:", "urn:"].includes(url.protocol)) {
      throw new InquiryDefinitionError("namespace", "must use an http, https, or urn absolute IRI");
    }
  } catch (error) {
    if (error instanceof InquiryDefinitionError) throw error;
    throw new InquiryDefinitionError("namespace", "must be an absolute IRI");
  }
  return parsed;
}

function localEndpoint(value: unknown): string {
  const parsed = string(value, "runtime.endpoint");
  let url: URL;
  try {
    url = new URL(parsed);
  } catch {
    throw new InquiryDefinitionError("runtime.endpoint", "must be an absolute URL");
  }
  if (url.protocol !== "http:") {
    throw new InquiryDefinitionError(
      "runtime.endpoint",
      "must use HTTP for the local external Fluree process"
    );
  }
  const loopback =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "[::1]" ||
    url.hostname === "::1";
  if (!loopback) {
    throw new InquiryDefinitionError(
      "runtime.endpoint",
      "must target localhost or a loopback address"
    );
  }
  if (
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== "" ||
    (url.pathname !== "" && url.pathname !== "/")
  ) {
    throw new InquiryDefinitionError(
      "runtime.endpoint",
      "must contain only the local Fluree origin"
    );
  }
  return url.origin;
}

/** Convert a Fluree ledger alias to its canonical branch-qualified identity. */
export function canonicalLedgerId(value: string): string {
  if (!LEDGER_PATTERN.test(value) || value.includes("..") || value.includes("//")) {
    throw new InquiryDefinitionError(
      "ledger",
      "must be a Fluree ledger name or ledger-name:branch identity"
    );
  }
  return value.includes(":") ? value : `${value}:main`;
}

function refPolicy(value: unknown): InquiryRefPolicy {
  const parsed = record(value, "repository.refPolicy");
  exactKeys(parsed, "repository.refPolicy", ["version", "include", "exclude"]);
  const include = stringList(parsed.include, "repository.refPolicy.include");
  const exclude = stringList(parsed.exclude, "repository.refPolicy.exclude", true);
  for (const [kind, prefixes] of [
    ["include", include],
    ["exclude", exclude],
  ] as const) {
    for (const [index, prefix] of prefixes.entries()) {
      if (!prefix.startsWith("refs/") || prefix.includes("..") || prefix.includes("\0")) {
        throw new InquiryDefinitionError(
          `repository.refPolicy.${kind}[${index}]`,
          "must be a Git refs/ prefix"
        );
      }
    }
  }
  return {
    version: string(parsed.version, "repository.refPolicy.version"),
    include,
    exclude,
  };
}

/** Parse and validate a repository's explicit temporal-inquiry opt-in. */
export function validateInquiryDefinition(
  value: unknown,
  options: ValidateInquiryDefinitionOptions = {}
): InquiryDefinition {
  const parsed = record(value, "definition");
  exactKeys(parsed, "definition", [
    "schemaVersion",
    "id",
    "ownerProject",
    "ledger",
    "namespace",
    "runtime",
    "repository",
    "model",
    "adapters",
    "frame",
  ]);
  if (parsed.schemaVersion !== INQUIRY_DEFINITION_SCHEMA_VERSION) {
    throw new InquiryDefinitionError(
      "schemaVersion",
      `must equal ${INQUIRY_DEFINITION_SCHEMA_VERSION}`
    );
  }

  const runtime = record(parsed.runtime, "runtime");
  exactKeys(runtime, "runtime", ["version"], ["endpoint", "storage"]);
  if (runtime.version !== SUPPORTED_FLUREE_VERSION) {
    throw new InquiryDefinitionError(
      "runtime.version",
      `must equal the proven runtime version ${SUPPORTED_FLUREE_VERSION}`
    );
  }

  const repository = record(parsed.repository, "repository");
  exactKeys(repository, "repository", ["definition", "refPolicy"], ["pins"]);

  const model = record(parsed.model, "model");
  exactKeys(
    model,
    "model",
    ["ontology", "rules", "shapes", "config", "facts"],
    ["materialization"]
  );

  const adapters = record(parsed.adapters, "adapters");
  exactKeys(adapters, "adapters", ["queries"], ["projection", "session"]);

  const frame = record(parsed.frame, "frame");
  exactKeys(frame, "frame", ["path"]);

  const root = options.root;
  const definition: InquiryDefinition = {
    schemaVersion: INQUIRY_DEFINITION_SCHEMA_VERSION,
    id: identifier(parsed.id, "id"),
    ownerProject: identifier(parsed.ownerProject, "ownerProject"),
    ledger: canonicalLedgerId(string(parsed.ledger, "ledger")),
    namespace: namespace(parsed.namespace),
    runtime: {
      version: SUPPORTED_FLUREE_VERSION,
      ...(runtime.endpoint === undefined ? {} : { endpoint: localEndpoint(runtime.endpoint) }),
      ...(runtime.storage === undefined
        ? {}
        : { storage: repoPath(runtime.storage, "runtime.storage", root) }),
    },
    repository: {
      definition: repoPath(repository.definition, "repository.definition", root),
      pins: stringList(repository.pins ?? [], "repository.pins", true).map((pin, index) => {
        if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(pin)) {
          throw new InquiryDefinitionError(
            `repository.pins[${index}]`,
            "must be one full lower-case Git object ID"
          );
        }
        return pin;
      }),
      refPolicy: refPolicy(repository.refPolicy),
    },
    model: {
      ontology: repoPath(model.ontology, "model.ontology", root),
      rules: repoPath(model.rules, "model.rules", root),
      shapes: repoPath(model.shapes, "model.shapes", root),
      config: repoPath(model.config, "model.config", root),
      facts: stringList(model.facts, "model.facts").map((path, index) =>
        repoPath(path, `model.facts[${index}]`, root)
      ),
      ...(model.materialization === undefined
        ? {}
        : {
            materialization: repoPath(model.materialization, "model.materialization", root),
          }),
    },
    adapters: {
      ...(adapters.projection === undefined
        ? {}
        : { projection: repoPath(adapters.projection, "adapters.projection", root) }),
      ...(adapters.session === undefined
        ? {}
        : { session: repoPath(adapters.session, "adapters.session", root) }),
      queries: repoPath(adapters.queries, "adapters.queries", root),
    },
    frame: {
      path: repoPath(frame.path, "frame.path", root),
    },
  };
  requireExtension(definition.repository.definition, ".json", "repository.definition");
  requireExtension(definition.model.ontology, ".trig", "model.ontology");
  requireExtension(definition.model.rules, ".trig", "model.rules");
  requireExtension(definition.model.shapes, ".ttl", "model.shapes");
  requireExtension(definition.model.config, ".trig", "model.config");
  definition.model.facts.forEach((path, index) => {
    requireExtension(path, ".jsonld", `model.facts[${index}]`);
  });
  if (definition.model.materialization !== undefined) {
    requireExtension(definition.model.materialization, ".sparql", "model.materialization");
  }
  requireExtension(definition.frame.path, ".md", "frame.path");
  return definition;
}

/** Return every consumer-owned input named by one admitted inquiry definition. */
export function inquiryDefinitionInputs(
  definition: InquiryDefinition
): readonly { readonly path: string; readonly kind: "directory" | "file" }[] {
  return [
    { path: definition.repository.definition, kind: "file" },
    { path: definition.model.ontology, kind: "file" },
    { path: definition.model.rules, kind: "file" },
    { path: definition.model.shapes, kind: "file" },
    { path: definition.model.config, kind: "file" },
    ...definition.model.facts.map((path) => ({ path, kind: "file" as const })),
    ...(definition.model.materialization === undefined
      ? []
      : [{ path: definition.model.materialization, kind: "file" as const }]),
    ...(definition.adapters.projection === undefined
      ? []
      : [{ path: definition.adapters.projection, kind: "file" as const }]),
    ...(definition.adapters.session === undefined
      ? []
      : [{ path: definition.adapters.session, kind: "file" as const }]),
    { path: definition.adapters.queries, kind: "directory" },
    { path: definition.frame.path, kind: "file" },
  ];
}

function requireExtension(path: string, extension: string, field: string): void {
  if (!path.endsWith(extension)) {
    throw new InquiryDefinitionError(field, `must use the native ${extension} format`);
  }
}

/** Read a JSON definition and verify that every declared authored input exists. */
export async function loadInquiryDefinition(
  root: string,
  definitionPath: string
): Promise<InquiryDefinition> {
  const absoluteRoot = resolve(root);
  const safeDefinitionPath = repoPath(definitionPath, "definitionPath", absoluteRoot);
  const absoluteDefinitionPath = resolve(absoluteRoot, safeDefinitionPath);
  let value: unknown;
  try {
    value = JSON.parse(await readFile(absoluteDefinitionPath, "utf8"));
  } catch (error) {
    throw new InquiryDefinitionError(
      "definitionPath",
      `could not read valid JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  const definition = validateInquiryDefinition(value, { root: absoluteRoot });
  for (const input of inquiryDefinitionInputs(definition)) {
    try {
      const info = await stat(resolve(absoluteRoot, input.path));
      if (
        (input.kind === "file" && !info.isFile()) ||
        (input.kind === "directory" && !info.isDirectory())
      ) {
        throw new Error(`is not a ${input.kind}`);
      }
    } catch (error) {
      throw new InquiryDefinitionError(
        input.path,
        `declared input is unavailable: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  return definition;
}
