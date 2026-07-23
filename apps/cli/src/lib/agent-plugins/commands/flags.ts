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

export const providerTargetFlag = Flags.string({
  description: "Explicit provider=absolute-home target",
  multiple: true,
});

export const providerTestDisposableRootFlag = Flags.string({
  description: "Canonical absolute root containing every disposable provider home",
});

export const gitExecutableFlag = Flags.string({
  description: "Absolute Git executable",
});

export const releaseMemberFlag = Flags.string({
  description: "Explicit curated release member identity",
  multiple: true,
});

export const CHECK_MODES = [
  "release",
  "repository-staged",
  "repository-clean",
  "release-input-record",
  "release-input-refresh",
  "current-main-record",
  "current-main-selection",
] as const;

export type CheckMode = (typeof CHECK_MODES)[number];

export const checkModeFlag = Flags.string({
  description: "Closed curated lifecycle check mode",
  options: [...CHECK_MODES],
  default: "release",
});

export const currentMainBodyJsonFlag = Flags.string({
  description: "Inline current-main v3 record JSON",
});

export const currentMainRecordJsonFlag = Flags.string({
  description: "Exact inline current-main v3 record JSON",
});

export const providerExecutableFlag = Flags.string({
  description: "Explicit provider=absolute-executable binding",
  multiple: true,
});
