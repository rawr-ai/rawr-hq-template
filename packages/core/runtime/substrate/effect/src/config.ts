import { readFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { parse } from "dotenv";

import type { RuntimeCompilationResult } from "../../../compiler/src/compile-runtime-plan";
import type { RuntimeProvider } from "../../../definition/src/provider";
import type { ServiceRuntimeExport } from "../../../definition/src/service";

type ConfigSchema = NonNullable<RuntimeProvider["configSchema"]>;
type SourcePolicy = RuntimeCompilationResult["plan"]["configSources"];
type ConfigRef = NonNullable<
  RuntimeCompilationResult["plan"]["compiledResources"][number]["configRef"]
>;
type Lookup = ReadonlyMap<string, unknown>;

interface ConfigPreflightInput {
  readonly plan: Pick<
    RuntimeCompilationResult["plan"],
    "configSources" | "compiledResources" | "serviceBindings"
  >;
  readonly references: Pick<RuntimeCompilationResult["references"], "getProvider" | "getService">;
}

export interface RuntimeSourceInput {
  readonly appRoot: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly memory?: Readonly<Record<string, unknown>>;
  readonly test?: Readonly<Record<string, unknown>>;
}

export interface ServiceConfigValues {
  readonly scope?: unknown;
  readonly config?: unknown;
}

export interface PreflightConfig {
  provider(selectionId: string): unknown;
  service(bindingId: string): ServiceConfigValues;
}

function snapshot(input: Readonly<Record<string, unknown>>, env = false): Lookup {
  return new Map(
    Object.getOwnPropertyNames(input).flatMap((key) => {
      const value = input[key];
      return env && value === undefined ? [] : [[key, value] as const];
    })
  );
}

/** Validate whole records, but leave value interpretation to the shared vendor parser. */
function parseDotenv(text: string): Lookup {
  const source = text.replace(/\r\n?/g, "\n");
  const names: string[] = [];
  const records: string[] = [];
  let offset = 0;
  while (offset < source.length) {
    const gap = /^[\t \n]*(?:#[^\n]*(?:\n|$))?/.exec(source.slice(offset))?.[0] ?? "";
    offset += gap.length;
    if (offset === source.length) break;
    if (gap.includes("#")) continue;
    const header = /^(?:export[\t ]+)?([A-Za-z0-9_.-]+)[\t ]*(?:=|:[\t ]+)[\t ]*/.exec(
      source.slice(offset)
    );
    if (header === null) throw new TypeError("Malformed dotenv source.");
    const name = header[1];
    if (name === undefined) throw new TypeError("Malformed dotenv source.");
    offset += header[0].length;
    const start = offset;
    const quote = source[offset];
    if (quote === "'" || quote === '"' || quote === "`") {
      // These are the vendor's quote-token boundaries, not a second escape decoder.
      const token =
        quote === "'"
          ? /^'(?:\\'|[^'])*'/
          : quote === '"'
            ? /^"(?:\\"|[^"])*"/
            : /^`(?:\\`|[^`])*`/;
      const quoted = token.exec(source.slice(offset));
      if (quoted === null) throw new TypeError("Malformed dotenv source.");
      offset += quoted[0].length;
      const tail = /^[\t ]*(?:#[^\n]*)?(?:\n|$)/.exec(source.slice(offset));
      if (tail === null) throw new TypeError("Malformed dotenv source.");
      records.push(`HABITAT_SOURCE_${names.length}=${source.slice(start, offset)}`);
      offset += tail[0].length;
    } else {
      const end = source.indexOf("\n", offset);
      offset = end === -1 ? source.length : end;
      records.push(`HABITAT_SOURCE_${names.length}=${source.slice(start, offset)}`);
    }
    names.push(name);
  }
  const parsed = parse(records.join("\n"));
  const values = new Map<string, unknown>();
  names.forEach((name, index) => {
    const temporary = `HABITAT_SOURCE_${index}`;
    if (!Object.hasOwn(parsed, temporary)) throw new TypeError("Malformed dotenv source.");
    values.set(name, parsed[temporary]);
  });
  return values;
}

async function materializeSources(
  policy: SourcePolicy,
  input: RuntimeSourceInput
): Promise<readonly Lookup[]> {
  if (typeof input.appRoot !== "string" || !isAbsolute(input.appRoot)) {
    throw new TypeError("Runtime config requires an absolute app root.");
  }
  const env = snapshot(input.env ?? process.env, true);
  const memory = input.memory === undefined ? undefined : snapshot(input.memory);
  const test = input.test === undefined ? undefined : snapshot(input.test);
  const sources: Lookup[] = [];
  for (const source of policy) {
    if (source.kind === "env") {
      sources.push(env);
      continue;
    }
    if (source.kind === "memory" || source.kind === "test") {
      const values = source.kind === "memory" ? memory : test;
      if (values === undefined) throw new TypeError("A declared runtime config source is absent.");
      sources.push(values);
      continue;
    }
    let bytes: Uint8Array;
    try {
      bytes = await readFile(join(input.appRoot, ...source.path.split("/")));
    } catch (error) {
      if (
        source.optional &&
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        sources.push(new Map());
        continue;
      }
      throw new TypeError("A declared runtime config source cannot be read.");
    }
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (source.kind === "dotenv") {
        sources.push(parseDotenv(text));
      } else {
        const value: unknown = JSON.parse(text);
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
          throw new TypeError("File config must be a JSON object.");
        }
        sources.push(snapshot(value as Record<string, unknown>));
      }
    } catch {
      throw new TypeError("A declared runtime config source is malformed.");
    }
  }
  return sources;
}

function decode(
  ref: ConfigRef | undefined,
  schema: ConfigSchema | undefined,
  sources: readonly Lookup[]
): unknown {
  if (schema === undefined && ref === undefined) return undefined;
  if (schema === undefined || ref === undefined)
    throw new TypeError("Runtime config schema and reference disagree.");
  for (const [index, source] of ref.sources.entries()) {
    const values = sources[index];
    const key = source.kind === "runtime.config.env" ? source.name : source.key;
    if (values?.has(key) !== true) continue;
    try {
      const result = schema.decode(values.get(key));
      if (result.success) return result.value;
    } catch {
      // Schema errors may contain secrets; only the private caller receives decoded values.
    }
    throw new TypeError("The winning runtime config value failed its owning schema.");
  }
  throw new TypeError("No runtime config source contains the required exact key.");
}

export async function preflightConfig(
  compilation: ConfigPreflightInput,
  input: RuntimeSourceInput
): Promise<PreflightConfig> {
  const sources = await materializeSources(compilation.plan.configSources, input);
  const providers = new Map<string, unknown>();
  const services = new Map<string, ServiceConfigValues>();
  for (const resource of compilation.plan.compiledResources) {
    const provider = compilation.references.getProvider(resource.selectionId);
    providers.set(resource.selectionId, decode(resource.configRef, provider.configSchema, sources));
  }
  for (const binding of compilation.plan.serviceBindings) {
    const definition: ServiceRuntimeExport["definition"] = compilation.references.getService(
      binding.bindingId
    ).definition;
    services.set(
      binding.bindingId,
      Object.freeze({
        ...(definition.scope === undefined
          ? {}
          : { scope: decode(binding.scopeRef, definition.scope, sources) }),
        ...(definition.config === undefined
          ? {}
          : { config: decode(binding.configRef, definition.config, sources) }),
      })
    );
  }
  return Object.freeze({
    provider: (selectionId: string): unknown => {
      if (!providers.has(selectionId)) throw new TypeError("Provider config is not preflighted.");
      return providers.get(selectionId);
    },
    service: (bindingId: string): ServiceConfigValues => {
      const value = services.get(bindingId);
      if (value === undefined) throw new TypeError("Service config is not preflighted.");
      return value;
    },
  });
}
