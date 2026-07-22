declare const officialCommandTopicBrand: unique symbol;
declare const officialCommandNameBrand: unique symbol;

export type OfficialCommandTopic = string & { readonly [officialCommandTopicBrand]: true };
export type OfficialCommandName = string & { readonly [officialCommandNameBrand]: true };
export type OfficialCommandIdentityIssue = Readonly<{
  path: "name" | "topic" | "workspaceCwd";
  message: string;
}>;

const SEGMENT_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const RESERVED_TOPICS = new Set(["agent", "plugins"]);

export function parseOfficialCommandTopic(
  input: unknown
): OfficialCommandTopic | OfficialCommandIdentityIssue {
  if (
    typeof input !== "string" ||
    input.length > 64 ||
    !SEGMENT_PATTERN.test(input) ||
    RESERVED_TOPICS.has(input)
  ) {
    return Object.freeze({
      path: "topic",
      message:
        "Official command topic must be safe lowercase kebab-case and outside lifecycle-owned topics",
    });
  }
  return input as OfficialCommandTopic;
}

export function parseOfficialCommandName(
  input: unknown
): OfficialCommandName | OfficialCommandIdentityIssue {
  return typeof input === "string" && input.length <= 64 && SEGMENT_PATTERN.test(input)
    ? (input as OfficialCommandName)
    : Object.freeze({
        path: "name",
        message: "Official command name must be bounded lowercase kebab-case",
      });
}

export function isOfficialCommandIdentityIssue(
  value: OfficialCommandTopic | OfficialCommandName | OfficialCommandIdentityIssue
): value is OfficialCommandIdentityIssue {
  return typeof value === "object";
}
