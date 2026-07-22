declare const curatedAgentPluginIdentityBrand: unique symbol;

export type CuratedAgentPluginIdentity = string & {
  readonly [curatedAgentPluginIdentityBrand]: true;
};
export type CuratedAgentPluginIdentityIssue = Readonly<{
  path: "contentWorkspace" | "id";
  message: string;
}>;

const PLUGIN_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export function parseCuratedAgentPluginIdentity(
  input: unknown
): CuratedAgentPluginIdentity | CuratedAgentPluginIdentityIssue {
  return typeof input === "string" && input.length <= 64 && PLUGIN_ID_PATTERN.test(input)
    ? (input as CuratedAgentPluginIdentity)
    : Object.freeze({
        path: "id",
        message: "Curated agent-plugin identity must be bounded lowercase kebab-case",
      });
}

export function isCuratedAgentPluginIdentityIssue(
  value: CuratedAgentPluginIdentity | CuratedAgentPluginIdentityIssue
): value is CuratedAgentPluginIdentityIssue {
  return typeof value === "object";
}
