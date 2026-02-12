import fs from "node:fs/promises";
import path from "node:path";

import { type Static,Type } from "typebox";
import { Value } from "typebox/value";
import { parse as parseYaml } from "yaml";

import { pathExists } from "./fs-utils";

const ImportsSchema = Type.Object(
  {
    toolkits: Type.Optional(Type.Union([Type.Literal("all"), Type.Array(Type.String({ minLength: 1 }))])),
  },
  { additionalProperties: false },
);

const RequiresSchema = Type.Object(
  {
    toolkits: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
  },
  { additionalProperties: false },
);

const PluginYamlV1Schema = Type.Object(
  {
    version: Type.Literal(1),
    imports: Type.Optional(ImportsSchema),
    requires: Type.Optional(RequiresSchema),
  },
  { additionalProperties: false },
);

export type PluginYamlV1 = Static<typeof PluginYamlV1Schema>;

export async function readPluginYaml(pluginAbsPath: string): Promise<{
  path: string | null;
  config: PluginYamlV1 | null;
  warnings: string[];
}> {
  const filePath = path.join(pluginAbsPath, "plugin.yaml");
  if (!(await pathExists(filePath))) return { path: null, config: null, warnings: [] };

  let parsed: unknown;
  try {
    const raw = await fs.readFile(filePath, "utf8");
    parsed = parseYaml(raw);
  } catch (err) {
    return { path: filePath, config: null, warnings: [`Failed to parse plugin.yaml: ${err instanceof Error ? err.message : String(err)}`] };
  }

  if (!Value.Check(PluginYamlV1Schema, parsed)) {
    const errs = [...Value.Errors(PluginYamlV1Schema, parsed)]
      .slice(0, 5)
      .map((e) => {
        const anyErr = e as any;
        const p = anyErr.path ?? anyErr.instancePath ?? anyErr.schemaPath ?? "(root)";
        return `${p}: ${e.message}`;
      });
    return { path: filePath, config: null, warnings: [`Invalid plugin.yaml (expected version: 1).`, ...errs] };
  }

  return { path: filePath, config: parsed as PluginYamlV1, warnings: [] };
}
