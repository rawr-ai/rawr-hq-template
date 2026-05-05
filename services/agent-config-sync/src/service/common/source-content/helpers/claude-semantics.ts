import YAML from "yaml";
import type {
  SemanticCapabilityKind,
  SourceContent,
  SyncAgent,
} from "../../entities";
import type { ProjectionSupport } from "../../entities/sync-results";
import type { AgentConfigSyncResources } from "../../resources";

type ParsedMarkdown = {
  frontmatter: Record<string, unknown>;
  body: string;
  frontmatterError?: string;
};

type TaskSpawnSpec = {
  id: string;
  sourceKind: "skill" | "agent";
  sourceName: string;
  targetAgent?: string;
  nested: boolean;
};

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const SKILL_INVOCATION_PATTERN = /Skill\s*\(\s*skill\s*:\s*["']([^"']+)["']/g;
const TASK_BLOCK_PATTERN = /Task\s*\(([\s\S]*?)\)/g;
const SUBAGENT_TYPE_PATTERN = /(?:subagent_type|agent|role)\s*:\s*["']?([A-Za-z0-9_.-]+)["']?/;
const TODO_WRITE_PATTERN = /\bTodoWrite\b/;
const HOOK_REFERENCE_PATTERN = /\b(?:PreToolUse|PostToolUse|Stop|SubagentStop|UserPromptSubmit)\b/g;
const ARTIFACT_REFERENCE_PATTERN = /\.(?:hyperresearch|claude|codex|json|md)\b/g;

export function parseClaudeMarkdown(raw: string): ParsedMarkdown {
  const match = raw.match(FRONTMATTER_PATTERN);
  if (!match) return { frontmatter: {}, body: raw.trim() };

  try {
    const parsed = YAML.parse(match[1] ?? "");
    const frontmatter = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
    return { frontmatter, body: raw.slice(match[0].length).trim() };
  } catch (err) {
    return {
      frontmatter: {},
      body: raw.slice(match[0].length).trim(),
      frontmatterError: err instanceof Error ? err.message : String(err),
    };
  }
}

export function stringField(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export function stringArrayField(value: unknown): string[] {
  if (Array.isArray(value)) {
    return uniqueSorted(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0));
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return uniqueSorted(value.split(",").map((item) => item.trim()).filter((item) => item.length > 0));
  }
  return [];
}

export function hasField(frontmatter: Record<string, unknown>, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(frontmatter, field);
}

export function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function findSkillInvocations(body: string): string[] {
  return uniqueSorted([...body.matchAll(SKILL_INVOCATION_PATTERN)]
    .map((match) => match[1])
    .filter((value): value is string => Boolean(value)));
}

function findHookReferences(body: string): string[] {
  return uniqueSorted([...body.matchAll(HOOK_REFERENCE_PATTERN)]
    .map((match) => match[0])
    .filter(Boolean));
}

function findArtifactReferences(body: string): string[] {
  return uniqueSorted([...body.matchAll(ARTIFACT_REFERENCE_PATTERN)]
    .map((match) => match[0])
    .filter(Boolean));
}

export function extractTaskSpawnsFromBody(input: {
  sourceKind: "skill" | "agent";
  sourceName: string;
  body: string;
}): TaskSpawnSpec[] {
  return [...input.body.matchAll(TASK_BLOCK_PATTERN)].map((match, index) => {
    const block = match[1] ?? "";
    const subagent = block.match(SUBAGENT_TYPE_PATTERN)?.[1];
    return {
      id: `${input.sourceKind}:${input.sourceName}:task:${index + 1}`,
      sourceKind: input.sourceKind,
      sourceName: input.sourceName,
      targetAgent: subagent,
      nested: input.sourceKind === "agent",
    };
  });
}

export function supportForCodexAgentFrontmatterField(input: {
  sourceName: string;
  field: string;
}): ProjectionSupport {
  const semanticKind: SemanticCapabilityKind =
    input.field === "model" ? "model_selection"
      : input.field === "tools" ? "tool_lock"
        : input.field === "hooks" ? "hook"
          : input.field === "mcpServers" ? "mcp_server"
            : input.field === "color" ? "cosmetic"
              : "settings";

  const supportStatus =
    semanticKind === "hook" ||
    semanticKind === "mcp_server" ||
    semanticKind === "tool_lock" ||
    semanticKind === "cosmetic"
      ? "unsupported"
      : "adapter_required";

  return {
    provider: "codex",
    semanticKind,
    source: `${input.sourceName}:${input.field}`,
    supportStatus,
    evidenceLevel: "source_code",
    notes: [`Claude agent frontmatter field '${input.field}' is not emitted into Codex role TOML`],
  };
}

export async function buildProviderSemanticSupport(input: {
  provider: SyncAgent;
  content: SourceContent;
  resources: AgentConfigSyncResources;
}): Promise<ProjectionSupport[]> {
  const support: ProjectionSupport[] = [];

  for (const skill of input.content.skills) {
    const skillPath = input.resources.path.join(skill.absPath, "SKILL.md");
    const raw = await input.resources.files.readTextFile(skillPath);
    if (raw === null) continue;
    const parsed = parseClaudeMarkdown(raw);
    addSupport(support, {
      provider: input.provider,
      semanticKind: "skill_step",
      source: skill.name,
      supportStatus: "native",
      evidenceLevel: input.provider === "claude" ? "official" : "local_verified",
      notes: [input.provider === "claude"
        ? "Claude skill file is copied as provider-native skill content"
        : "Codex skill directory is copied to the runtime user skill root"],
    });

    for (const invokedSkill of findSkillInvocations(parsed.body)) {
      addSupport(support, skillInvocationSupport(input.provider, skill.name, invokedSkill));
    }

    for (const spawn of extractTaskSpawnsFromBody({ sourceKind: "skill", sourceName: skill.name, body: parsed.body })) {
      addSupport(support, taskSpawnSupport(input.provider, spawn));
    }

    if (TODO_WRITE_PATTERN.test(parsed.body)) {
      addSupport(support, {
        provider: input.provider,
        semanticKind: "todo_state",
        source: skill.name,
        supportStatus: input.provider === "claude" ? "native" : "adapter_required",
        evidenceLevel: "source_code",
        notes: [input.provider === "claude"
          ? "Claude TodoWrite usage is preserved in copied instructions"
          : "Codex has no Claude TodoWrite tool contract; state needs an adapter or artifact-backed checklist"],
      });
    }

    for (const hook of findHookReferences(parsed.body)) {
      addSupport(support, {
        provider: input.provider,
        semanticKind: "hook",
        source: `${skill.name}:${hook}`,
        supportStatus: input.provider === "claude" ? "native" : "unsupported",
        evidenceLevel: "source_code",
        notes: [input.provider === "claude"
          ? "Claude hook reference remains meaningful in Claude instructions"
          : "Codex direct hook sync is material-native, but Claude hook references inside skill text are not runtime semantics"],
      });
    }

    for (const artifact of findArtifactReferences(parsed.body)) {
      addSupport(support, {
        provider: input.provider,
        semanticKind: "artifact_state",
        source: `${skill.name}:${artifact}`,
        supportStatus: "adapter_required",
        evidenceLevel: "inferred",
        notes: ["Durable workflow artifacts need provider-specific lifecycle handling beyond file copy"],
      });
    }
  }

  for (const spec of input.content.orchestration ?? []) {
    for (const invokedSkill of spec.skillInvocations) {
      addSupport(support, skillInvocationSupport(input.provider, sourceNameForSpec(spec.name), invokedSkill));
    }
    for (const task of spec.taskSpawns) {
      addSupport(support, taskSpawnSupport(input.provider, {
        id: `${spec.name}:task:${task}`,
        sourceKind: spec.sourceKind === "agent" ? "agent" : "skill",
        sourceName: sourceNameForSpec(spec.name),
        targetAgent: task,
        nested: spec.sourceKind === "agent",
      }));
    }
    if (spec.todoState) {
      const source = sourceNameForSpec(spec.name);
      addSupport(support, {
        provider: input.provider,
        semanticKind: "todo_state",
        source,
        supportStatus: input.provider === "claude" ? "native" : "adapter_required",
        evidenceLevel: "source_code",
        notes: [input.provider === "claude"
          ? "Claude TodoWrite usage is preserved in copied instructions"
          : "Codex has no Claude TodoWrite tool contract; state needs an adapter or artifact-backed checklist"],
      });
    }
  }

  for (const agent of input.content.agentFiles) {
    const raw = await input.resources.files.readTextFile(agent.absPath);
    if (raw === null) continue;
    const parsed = parseClaudeMarkdown(raw);
    addSupport(support, {
      provider: input.provider,
      semanticKind: "agent_role",
      source: agent.name,
      supportStatus: "native",
      evidenceLevel: input.provider === "claude" ? "official" : "local_verified",
      notes: [input.provider === "claude"
        ? "Claude agent Markdown is provider-native"
        : "Codex role TOML supports name, description, and developer_instructions"],
    });

    if (hasField(parsed.frontmatter, "model")) {
      addSupport(support, {
        provider: input.provider,
        semanticKind: "model_selection",
        source: `${agent.name}:${String(parsed.frontmatter.model ?? "model")}`,
        supportStatus: input.provider === "claude" ? "native" : "adapter_required",
        evidenceLevel: "source_code",
        notes: [input.provider === "claude"
          ? "Claude model selector is preserved in agent frontmatter"
          : "Claude model names need explicit Codex model mapping before projection"],
      });
    }

    if (stringArrayField(parsed.frontmatter.tools).length > 0) {
      addSupport(support, {
        provider: input.provider,
        semanticKind: "tool_lock",
        source: agent.name,
        supportStatus: input.provider === "claude" ? "native" : "unsupported",
        evidenceLevel: "source_code",
        notes: [input.provider === "claude"
          ? "Claude agent tool allowlist is preserved in frontmatter"
          : "Codex role TOML does not enforce Claude-style per-agent tool allowlists"],
      });
    }

    if (hasField(parsed.frontmatter, "hooks")) {
      addSupport(support, agentFrontmatterSupport(input.provider, agent.name, "hooks", "hook"));
    }
    if (hasField(parsed.frontmatter, "mcpServers")) {
      addSupport(support, agentFrontmatterSupport(input.provider, agent.name, "mcpServers", "mcp_server"));
    }
    if (hasField(parsed.frontmatter, "skills")) {
      addSupport(support, agentFrontmatterSupport(input.provider, agent.name, "skills", "settings"));
    }
    if (hasField(parsed.frontmatter, "permissionMode")) {
      addSupport(support, agentFrontmatterSupport(input.provider, agent.name, "permissionMode", "settings"));
    }
    if (hasField(parsed.frontmatter, "color")) {
      addSupport(support, {
        provider: input.provider,
        semanticKind: "cosmetic",
        source: `${agent.name}:color`,
        supportStatus: input.provider === "claude" ? "native" : "unsupported",
        evidenceLevel: "source_code",
        notes: [input.provider === "claude"
          ? "Claude color metadata is preserved"
          : "Codex role projection drops Claude color metadata"],
      });
    }

    for (const spawn of extractTaskSpawnsFromBody({ sourceKind: "agent", sourceName: agent.name, body: parsed.body })) {
      addSupport(support, taskSpawnSupport(input.provider, spawn));
    }
  }

  return support;
}

export function relatedSemanticSupport(input: {
  source: string;
  semanticSupport: ProjectionSupport[];
}): ProjectionSupport[] {
  return input.semanticSupport.filter((support) =>
    support.source === input.source ||
    support.source.startsWith(`${input.source}:`) ||
    support.source.startsWith(`${input.source} -> `)
  );
}

export function nonNativeSemanticSupport(support: ProjectionSupport[]): ProjectionSupport[] {
  return support.filter((item) => item.supportStatus !== "native");
}

function sourceNameForSpec(name: string): string {
  const index = name.indexOf(":");
  return index >= 0 ? name.slice(index + 1) : name;
}

function skillInvocationSupport(
  provider: SyncAgent,
  sourceSkill: string,
  invokedSkill: string,
): ProjectionSupport {
  return {
    provider,
    semanticKind: "skill_invocation",
    source: `${sourceSkill} -> ${invokedSkill}`,
    supportStatus: provider === "claude" ? "native" : "adapter_required",
    evidenceLevel: "source_code",
    notes: [provider === "claude"
      ? "Claude Skill(...) invocation is preserved in copied skill content"
      : "Codex skills are local instructions; Claude Skill(...) requires an adapter or rewritten instructions"],
  };
}

function taskSpawnSupport(provider: SyncAgent, spawn: TaskSpawnSpec): ProjectionSupport {
  return {
    provider,
    semanticKind: spawn.nested ? "task_spawn" : "parallel_task_join",
    source: spawn.targetAgent ? `${spawn.sourceName} -> ${spawn.targetAgent}` : spawn.sourceName,
    supportStatus: provider === "claude" ? "native" : "adapter_required",
    evidenceLevel: "source_code",
    notes: [provider === "claude"
      ? "Claude Task orchestration is preserved in copied instructions"
      : "Codex can spawn agents, but Claude Task(...) requires an orchestration adapter and explicit spawn mapping"],
  };
}

function agentFrontmatterSupport(
  provider: SyncAgent,
  sourceName: string,
  field: string,
  semanticKind: SemanticCapabilityKind,
): ProjectionSupport {
  return {
    provider,
    semanticKind,
    source: `${sourceName}:${field}`,
    supportStatus: provider === "claude" ? "native" : semanticKind === "settings" ? "adapter_required" : "unsupported",
    evidenceLevel: "source_code",
    notes: [provider === "claude"
      ? `Claude agent frontmatter field '${field}' is preserved`
      : `Claude agent frontmatter field '${field}' is not emitted into Codex role TOML`],
  };
}

function addSupport(items: ProjectionSupport[], item: ProjectionSupport): void {
  const key = JSON.stringify([
    item.provider,
    item.semanticKind,
    item.source,
    item.supportStatus,
    item.evidenceLevel,
  ]);
  if (items.some((existing) => JSON.stringify([
    existing.provider,
    existing.semanticKind,
    existing.source,
    existing.supportStatus,
    existing.evidenceLevel,
  ]) === key)) return;
  items.push(item);
}
