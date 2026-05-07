import { stringify } from "smol-toml";
import type { SourcePlugin } from "../../entities";
import type { ProjectionSupport } from "../../entities/sync-results";
import type { AgentConfigSyncResources } from "../../resources";
import {
  extractTaskSpawnsFromBody,
  hasField,
  parseClaudeMarkdown,
  stringField,
  supportForCodexAgentFrontmatterField,
} from "./claude-semantics";

export type CodexAgentProjection = {
  sourceName: string;
  sourcePath: string;
  targetName: string;
  toml: string;
  semanticSupport: ProjectionSupport[];
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

export async function buildCodexAgentProjection(input: {
  agent: { name: string; absPath: string };
  sourcePlugin: SourcePlugin;
  resources: AgentConfigSyncResources;
}): Promise<CodexAgentProjection> {
  const raw = await input.resources.files.readTextFile(input.agent.absPath);
  const parsed = parseClaudeMarkdown(raw ?? "");
  const description =
    stringField(parsed.frontmatter.description) ??
    input.sourcePlugin.description ??
    `Synced RAWR agent ${input.agent.name}`;

  const droppedSemantics = parsed.frontmatterError
    ? ["unparseable_frontmatter"]
    : CLAUDE_ONLY_FRONTMATTER_FIELDS.filter((field) =>
        hasField(parsed.frontmatter, field)
      );
  const semanticSupport: ProjectionSupport[] = [
    {
      provider: "codex",
      semanticKind: "agent_role",
      source: input.agent.name,
      supportStatus: "legacy_or_deprecated",
      evidenceLevel: "source_code",
      notes: ["Codex standalone role TOML projection supports name, description, and developer_instructions, but is not native provider plugin deployment"],
    },
    ...(!parsed.frontmatterError
      ? droppedSemantics.map((field) => supportForCodexAgentFrontmatterField({
          sourceName: input.agent.name,
          field,
        }))
      : [{
          provider: "codex" as const,
          semanticKind: "settings" as const,
          source: `${input.agent.name}:frontmatter`,
          supportStatus: "unknown" as const,
          evidenceLevel: "source_code" as const,
          notes: [`Agent frontmatter could not be parsed: ${parsed.frontmatterError}`],
        }]),
    ...extractTaskSpawnsFromBody({
      sourceKind: "agent",
      sourceName: input.agent.name,
      body: parsed.body,
    }).map((spawn) => ({
      provider: "codex" as const,
      semanticKind: "task_spawn" as const,
      source: spawn.targetAgent ? `${spawn.sourceName} -> ${spawn.targetAgent}` : spawn.sourceName,
      supportStatus: "adapter_required" as const,
      evidenceLevel: "source_code" as const,
      notes: ["Claude Task(...) requires a Codex orchestration adapter and explicit spawn mapping"],
    })),
  ];
  const adapterRequiredSemantics = semanticSupport
    .filter((support) => support.supportStatus === "adapter_required")
    .map((support) => support.source);

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
    semanticSupport,
    droppedSemantics,
    adapterRequiredSemantics,
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
