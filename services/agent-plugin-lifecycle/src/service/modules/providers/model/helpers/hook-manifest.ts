import { type Static, Type } from "typebox";
import { Value } from "typebox/value";

const HOOK_EVENT_NAME_PATTERN_SOURCE = "^[A-Za-z][A-Za-z0-9]*$";
const HOOK_EVENT_NAME_PATTERN = new RegExp(HOOK_EVENT_NAME_PATTERN_SOURCE, "u");
const HookHandlerSchema = Type.Object(
  { type: Type.String({ minLength: 1 }) },
  { additionalProperties: true }
);
const HookMatcherGroupSchema = Type.Object(
  { hooks: Type.Array(HookHandlerSchema, { minItems: 1 }) },
  { additionalProperties: true }
);
const HookManifestSchema = Type.Object(
  {
    description: Type.Optional(Type.String()),
    hooks: Type.Record(
      Type.String({ pattern: HOOK_EVENT_NAME_PATTERN_SOURCE }),
      Type.Array(HookMatcherGroupSchema, { minItems: 1 }),
      { additionalProperties: false }
    ),
  },
  { additionalProperties: false }
);
type HookManifest = Static<typeof HookManifestSchema>;

const NATIVE_HOOK_MANIFEST_PATH = "hooks/hooks.json";

export interface HookManifestFile {
  readonly path: string;
  readonly bytes: Uint8Array;
}

/** Reads provider-discoverable hook manifests into plugin-local event claims. */
export function hookEventSlugsFromManifests(files: readonly HookManifestFile[]): readonly string[] {
  const eventSlugs = new Set<string>();
  for (const file of files) {
    if (file.path !== NATIVE_HOOK_MANIFEST_PATH) continue;
    const manifest = decodeHookManifest(file);
    for (const eventName of Object.keys(manifest.hooks)) {
      eventSlugs.add(normalizeHookEventSlug(eventName));
    }
  }
  return Object.freeze([...eventSlugs].sort(compareText));
}

export function normalizeHookEventSlug(eventName: string): string {
  if (!HOOK_EVENT_NAME_PATTERN.test(eventName)) {
    throw new Error(`Hook event name is not canonical Pascal or camel case: ${eventName}`);
  }
  return eventName
    .replace(/([A-Z]+)([A-Z][a-z])/gu, "$1-$2")
    .replace(/([a-z0-9])([A-Z])/gu, "$1-$2")
    .toLowerCase();
}

function decodeHookManifest(file: HookManifestFile): HookManifest {
  let decoded: unknown;
  try {
    decoded = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(file.bytes));
  } catch {
    throw new Error(`Hook manifest is not valid UTF-8 JSON: ${file.path}`);
  }
  if (!Value.Check(HookManifestSchema, decoded)) {
    throw new Error(`Hook manifest does not match the supported TypeBox schema: ${file.path}`);
  }
  return decoded;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
