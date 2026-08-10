import {
  definePlugin,
  type EffectExecutionDescriptor,
  type PluginDefinition,
  type PluginFactory,
  type PluginFactoryArgs,
  type ResourceRequirement,
  type ServiceUse,
} from "../../../../../runtime/definition/src";
import type { RuntimeSchema } from "../../../runtime/schema";

export type McpServiceUses = Readonly<Record<string, ServiceUse>>;

export interface McpTextContent {
  readonly type: "text";
  readonly text: string;
}

export interface McpResourceContent {
  readonly type: "resource";
  readonly resource: {
    readonly uri: string;
    readonly mimeType?: string;
    readonly text?: string;
    readonly blob?: string;
  };
}

export type McpContent = McpTextContent | McpResourceContent;

export interface McpToolResult {
  readonly content: readonly McpContent[];
  readonly isError?: boolean;
  readonly structuredContent?: Readonly<Record<string, unknown>>;
}

export interface McpPromptMessage {
  readonly role: "user" | "assistant";
  readonly content: McpContent;
}

export interface McpPromptResult {
  readonly description?: string;
  readonly messages: readonly McpPromptMessage[];
}

type McpExecutionDescriptor<
  TInput,
  TOutput,
  TBoundary extends
    | "plugin.server-mcp-tool"
    | "plugin.server-mcp-resource"
    | "plugin.server-mcp-prompt",
> = EffectExecutionDescriptor<TInput, TOutput, unknown, unknown, TBoundary>;

export interface McpToolDefinition<TInput = unknown> {
  readonly memberType: "tool";
  readonly name: string;
  readonly title?: string;
  readonly description: string;
  readonly input: RuntimeSchema<TInput>;
  readonly output?: RuntimeSchema<unknown>;
  readonly execution: McpExecutionDescriptor<TInput, McpToolResult, "plugin.server-mcp-tool">;
}

export interface McpResourceDefinition<TInput = unknown> {
  readonly memberType: "resource";
  readonly name: string;
  readonly title?: string;
  readonly description?: string;
  readonly uriTemplate: string;
  readonly input: RuntimeSchema<TInput>;
  readonly execution: McpExecutionDescriptor<
    TInput,
    McpResourceContent,
    "plugin.server-mcp-resource"
  >;
}

export interface McpPromptDefinition<TInput = unknown> {
  readonly memberType: "prompt";
  readonly name: string;
  readonly title?: string;
  readonly description?: string;
  readonly input: RuntimeSchema<TInput>;
  readonly execution: McpExecutionDescriptor<TInput, McpPromptResult, "plugin.server-mcp-prompt">;
}

export type McpServerMember =
  | McpToolDefinition<unknown>
  | McpResourceDefinition<unknown>
  | McpPromptDefinition<unknown>;

/** Declares an MCP tool as a server-surface executable boundary. */
export function defineMcpTool<TInput>(
  input: Omit<McpToolDefinition<TInput>, "memberType">
): McpToolDefinition<TInput> {
  return Object.freeze({ ...input, memberType: "tool" });
}

/** Declares an MCP resource as a server-surface executable boundary. */
export function defineMcpResource<TInput>(
  input: Omit<McpResourceDefinition<TInput>, "memberType">
): McpResourceDefinition<TInput> {
  return Object.freeze({ ...input, memberType: "resource" });
}

/** Declares an MCP prompt as a server-surface executable boundary. */
export function defineMcpPrompt<TInput>(
  input: Omit<McpPromptDefinition<TInput>, "memberType">
): McpPromptDefinition<TInput> {
  return Object.freeze({ ...input, memberType: "prompt" });
}

export interface McpServerPluginAuthoring<TOptions, TServices extends McpServiceUses> {
  readonly capability: string;
  readonly services: TServices;
  readonly resources?: readonly ResourceRequirement[];
  readonly members: (options: TOptions) => readonly McpServerMember[];
  readonly instance?: string;
  readonly id?: string;
}

/** Authors MCP tools, resources, and prompts as one ordinary server surface. */
export const defineMcpServerPlugin = Object.freeze({
  factory<TOptions = void>() {
    return <const TCapability extends string, const TServices extends McpServiceUses>(
      input: McpServerPluginAuthoring<TOptions, TServices> & { readonly capability: TCapability }
    ): PluginFactory<TOptions, PluginDefinition<"server", "server.mcp", TCapability>> =>
      (...args: PluginFactoryArgs<TOptions>) =>
        definePlugin({
          id: input.id ?? `server.mcp.${input.capability}`,
          role: "server",
          surface: "server.mcp",
          capability: input.capability,
          ...(input.instance === undefined ? {} : { instance: input.instance }),
          serviceUses: Object.freeze(Object.values(input.services)),
          resourceRequirements: Object.freeze([...(input.resources ?? [])]),
          project: () => ({
            kind: "plugin.projection",
            facts: Object.freeze({
              members: Object.freeze([...input.members(args[0] as TOptions)]),
            }),
          }),
        });
  },
});

export { useService } from "../../../../../runtime/definition/src/service";
