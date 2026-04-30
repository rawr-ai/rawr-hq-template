export type AgentPluginSurface = "channel" | "shell" | "tool";

export interface AgentPluginInput {
  readonly capability: string;
  readonly tools?: readonly unknown[];
  readonly channels?: readonly unknown[];
  readonly shells?: readonly unknown[];
}

export interface AgentPluginDefinition<TSurface extends AgentPluginSurface = AgentPluginSurface> {
  readonly kind: "plugin.agent";
  readonly surface: TSurface;
  readonly capability: string;
  readonly id: string;
  readonly tools: readonly unknown[];
  readonly channels: readonly unknown[];
  readonly shells: readonly unknown[];
  readonly importSafety: "cold-declaration";
}

function defineAgentPlugin<TSurface extends AgentPluginSurface>(
  surface: TSurface,
  input: AgentPluginInput,
): AgentPluginDefinition<TSurface> {
  return {
    kind: "plugin.agent",
    surface,
    capability: input.capability,
    id: `agent.${surface}.${input.capability}`,
    tools: input.tools ?? [],
    channels: input.channels ?? [],
    shells: input.shells ?? [],
    importSafety: "cold-declaration",
  };
}

export function defineAgentToolPlugin(input: AgentPluginInput): AgentPluginDefinition<"tool"> {
  return defineAgentPlugin("tool", input);
}

export function defineAgentChannelPlugin(input: AgentPluginInput): AgentPluginDefinition<"channel"> {
  return defineAgentPlugin("channel", input);
}

export function defineAgentShellPlugin(input: AgentPluginInput): AgentPluginDefinition<"shell"> {
  return defineAgentPlugin("shell", input);
}
