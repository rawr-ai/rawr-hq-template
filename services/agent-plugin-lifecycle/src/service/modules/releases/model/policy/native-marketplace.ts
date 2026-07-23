import type { Static, TSchema } from "typebox";
import { Value } from "typebox/value";

import {
  type AgentPluginReleaseInput,
  compareCanonicalText,
  type PluginId,
} from "../../../../shared/release";
import {
  type ClaudeAgentPluginMarketplace,
  ClaudeAgentPluginMarketplaceSchema,
  type CodexAgentPluginMarketplace,
  CodexAgentPluginMarketplaceSchema,
} from "../dto/native-marketplace";

const decoder = new TextDecoder("utf-8", { fatal: true });

export type NativeMarketplaceValidation =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; detail: string }>;

/** Validates the two provider catalogs against one closed release-input membership set. */
export function validateNativeMarketplaces(
  input: Readonly<{
    releaseInput: AgentPluginReleaseInput;
    codexBytes: Uint8Array;
    claudeBytes: Uint8Array;
  }>
): NativeMarketplaceValidation {
  const codex = parseManifest(
    input.codexBytes,
    CodexAgentPluginMarketplaceSchema,
    ".agents/plugins/marketplace.json"
  );
  if (!codex.ok) return codex;
  const claude = parseManifest(
    input.claudeBytes,
    ClaudeAgentPluginMarketplaceSchema,
    ".claude-plugin/marketplace.json"
  );
  if (!claude.ok) return claude;

  const expectedAuthority = input.releaseInput.body.contentAuthority;
  if (codex.value.name !== expectedAuthority || claude.value.name !== expectedAuthority) {
    return invalid("Native marketplace identity differs from the release-input content authority.");
  }
  const expectedMembers = input.releaseInput.body.members.map((member) => member.pluginId);
  const codexMembers = validateCodexMembers(codex.value, expectedMembers);
  if (!codexMembers.ok) return codexMembers;
  return validateClaudeMembers(claude.value, expectedMembers);
}

function parseManifest<const Schema extends TSchema>(
  bytes: Uint8Array,
  schema: Schema,
  path: string
): Readonly<{ ok: true; value: Static<Schema> }> | Readonly<{ ok: false; detail: string }> {
  let candidate: unknown;
  try {
    candidate = JSON.parse(decoder.decode(bytes));
  } catch {
    return invalid(`Native marketplace manifest is not valid UTF-8 JSON: ${path}.`);
  }
  if (!Value.Check(schema, candidate)) {
    return invalid(`Native marketplace manifest does not match its TypeBox schema: ${path}.`);
  }
  return Object.freeze({ ok: true, value: candidate });
}

function validateCodexMembers(
  manifest: CodexAgentPluginMarketplace,
  expectedMembers: readonly PluginId[]
): NativeMarketplaceValidation {
  for (const plugin of manifest.plugins) {
    if (plugin.source.path !== expectedPluginSource(plugin.name)) {
      return invalid(`Codex marketplace source does not match plugin ${plugin.name}.`);
    }
  }
  return validateExactMembers(
    manifest.plugins.map((plugin) => plugin.name),
    expectedMembers,
    "Codex"
  );
}

function validateClaudeMembers(
  manifest: ClaudeAgentPluginMarketplace,
  expectedMembers: readonly PluginId[]
): NativeMarketplaceValidation {
  for (const plugin of manifest.plugins) {
    if (plugin.source !== expectedPluginSource(plugin.name)) {
      return invalid(`Claude marketplace source does not match plugin ${plugin.name}.`);
    }
  }
  return validateExactMembers(
    manifest.plugins.map((plugin) => plugin.name),
    expectedMembers,
    "Claude"
  );
}

function validateExactMembers(
  actualMembers: readonly PluginId[],
  expectedMembers: readonly PluginId[],
  provider: "Claude" | "Codex"
): NativeMarketplaceValidation {
  if (new Set(actualMembers).size !== actualMembers.length) {
    return invalid(`${provider} marketplace contains duplicate plugin identities.`);
  }
  const actual = [...actualMembers].sort(compareCanonicalText);
  const expected = [...expectedMembers].sort(compareCanonicalText);
  if (
    actual.length !== expected.length ||
    actual.some((pluginId, index) => pluginId !== expected[index])
  ) {
    return invalid(`${provider} marketplace plugin set differs from the release input.`);
  }
  return Object.freeze({ ok: true });
}

function expectedPluginSource(pluginId: PluginId): string {
  return `./plugins/agents/${pluginId}`;
}

function invalid(detail: string): Extract<NativeMarketplaceValidation, { ok: false }> {
  return Object.freeze({ ok: false, detail });
}
