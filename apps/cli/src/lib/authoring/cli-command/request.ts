import path from "node:path";

import {
  isOfficialCommandIdentityIssue,
  parseOfficialCommandName,
  parseOfficialCommandTopic,
  type OfficialCommandIdentityIssue,
  type OfficialCommandName,
  type OfficialCommandTopic,
} from "./identity";

export type OfficialCommandAuthoringRequest = Readonly<{
  topic: OfficialCommandTopic;
  name: OfficialCommandName;
  workspaceCwd: string;
  dryRun: boolean;
}>;

export type OfficialCommandRequestResult =
  | Readonly<{ ok: true; value: OfficialCommandAuthoringRequest }>
  | Readonly<{ ok: false; issues: readonly [OfficialCommandIdentityIssue, ...OfficialCommandIdentityIssue[]] }>;

export function parseOfficialCommandAuthoringRequest(input: Readonly<{
  topic: unknown;
  name: unknown;
  workspaceCwd: unknown;
  dryRun: unknown;
}>): OfficialCommandRequestResult {
  const topic = parseOfficialCommandTopic(input.topic);
  const name = parseOfficialCommandName(input.name);
  const issues = [topic, name].filter(isOfficialCommandIdentityIssue);
  if (typeof input.workspaceCwd !== "string" || input.workspaceCwd.length === 0) {
    issues.push(Object.freeze({ path: "workspaceCwd", message: "Template workspace cwd is required" }));
  }
  if (issues.length > 0 || isOfficialCommandIdentityIssue(topic) || isOfficialCommandIdentityIssue(name)) {
    return Object.freeze({
      ok: false,
      issues: Object.freeze(issues) as readonly [OfficialCommandIdentityIssue, ...OfficialCommandIdentityIssue[]],
    });
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      topic,
      name,
      workspaceCwd: path.resolve(input.workspaceCwd as string),
      dryRun: input.dryRun === true,
    }),
  });
}
