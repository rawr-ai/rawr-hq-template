import { stringify } from "smol-toml";
import YAML from "yaml";
import type { SourcePlugin } from "../../entities";
import type { AgentConfigSyncResources } from "../../resources";

export type CodexAgentProjection = {
  sourceName: string;
  sourcePath: string;
  targetName: string;
  toml: string;
  droppedSemantics: string[];
  adapterRequiredSemantics: string[];
  validationNotes: string[];
};

const CLAUDE_ONLY_FRONTMATTER_FIELDS = [
  "tools",
  "hooks",
  "mcpServers",
  "permissionMode",
  "skills",
  "model",
  "color",
] as const;

type ParsedMarkdownAgent = {
  frontmatter: Record<string, unknown>;
  body: string;
  frontmatterError?: string;
};

function parseMarkdownAgent(raw: string): ParsedMarkdownAgent {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { frontmatter: {}, body: raw.trim() };

  let parsed: unknown;
  try {
    parsed = YAML.parse(match[1] ?? "");
  } catch (err) {
    return {
      frontmatter: {},
      body: raw.slice(match[0].length).trim(),
      frontmatterError: err instanceof Error ? err.message : String(err),
    };
  }
  const frontmatter = parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : {};
  return { frontmatter, body: raw.slice(match[0].length).trim() };
}

function stringField(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export async function buildCodexAgentProjection(input: {
  agent: { name: string; absPath: string };
  sourcePlugin: SourcePlugin;
  resources: AgentConfigSyncResources;
}): Promise<CodexAgentProjection> {
  const raw = await input.resources.files.readTextFile(input.agent.absPath);
  const parsed = parseMarkdownAgent(raw ?? "");
  const description =
    stringField(parsed.frontmatter.description) ??
    input.sourcePlugin.description ??
    `Synced RAWR agent ${input.agent.name}`;

  const droppedSemantics = parsed.frontmatterError
    ? ["unparseable_frontmatter"]
    : CLAUDE_ONLY_FRONTMATTER_FIELDS.filter((field) =>
        Object.prototype.hasOwnProperty.call(parsed.frontmatter, field)
      );

  const toml = stringify({
    name: input.agent.name,
    description,
    developer_instructions: parsed.body,
  });

  return {
    sourceName: input.agent.name,
    sourcePath: input.agent.absPath,
    targetName: `${input.agent.name}.toml`,
    toml: toml.endsWith("\n") ? toml : `${toml}\n`,
    droppedSemantics,
    adapterRequiredSemantics: droppedSemantics,
    validationNotes: [
      ...(parsed.frontmatterError
        ? [`Agent frontmatter could not be parsed; mapped body with fallback metadata: ${parsed.frontmatterError}`]
        : []),
      ...(droppedSemantics.length > 0 && !parsed.frontmatterError
        ? ["Claude-only frontmatter was not mapped into Codex TOML"]
        : []),
      ...(droppedSemantics.length === 0
        ? ["Mapped safe Codex fields only: name, description, developer_instructions"]
        : []),
    ],
  };
}
