import { Flags } from "@oclif/core";

export const contentWorkspaceFlags = {
  "content-workspace": Flags.string({ description: "Canonical absolute content workspace" }),
  "repository-identity": Flags.string({ description: "Expected content repository identity" }),
  "content-authority": Flags.string({ description: "Declared content authority" }),
  ref: Flags.string({ description: "Qualified Git ref" }),
  "source-commit": Flags.string({ description: "Exact source commit object" }),
  "source-tree": Flags.string({ description: "Exact source tree object" }),
  "release-input": Flags.string({ description: "Canonical release-input path" }),
} as const;

export const releaseWorkspaceFlags = {
  ...contentWorkspaceFlags,
  "remote-name": Flags.string({ description: "Declared Git remote name" }),
  "remote-url": Flags.string({ description: "Declared Git remote URL" }),
  "plugin-root": Flags.string({ description: "Canonical agent-plugin root" }),
  plugin: Flags.string({ description: "Target one declared agent plugin" }),
  "complete-set": Flags.boolean({ description: "Select the complete release set" }),
} as const;

export const artifactFlag = Flags.string({
  description: "Canonical release:<rd1>:<ad1> or release-set:<rs1> handle",
});

export const providerTargetFlag = Flags.string({
  description: "Explicit provider=absolute-home target",
  multiple: true,
});

export const gitExecutableFlag = Flags.string({
  description: "Absolute controller-bound Git executable",
});

export const CHECK_MODES = [
  "release",
  "repository-staged",
  "repository-clean",
] as const;

export type CheckMode = (typeof CHECK_MODES)[number];

export const checkModeFlag = Flags.string({
  description: "Closed curated lifecycle check mode",
  options: [...CHECK_MODES],
  default: "release",
});

export const hostedGovernanceExecutableFlag = Flags.string({
  description: "Absolute controller-bound GitHub CLI executable for hosted approval reads",
});

export const providerExecutableFlag = Flags.string({
  description: "Explicit provider=absolute-executable binding",
  multiple: true,
});

export const gitPointerFlags = (prefix: "policy" | "request" | "acceptance" | "landed") => ({
  [`${prefix}-ref`]: Flags.string({ description: `${prefix} object Git ref` }),
  [`${prefix}-commit`]: Flags.string({ description: `${prefix} object commit` }),
  [`${prefix}-tree`]: Flags.string({ description: `${prefix} object tree` }),
  [`${prefix}-path`]: Flags.string({ description: `${prefix} object repository path` }),
  [`${prefix}-blob`]: Flags.string({ description: `${prefix} object blob` }),
});
