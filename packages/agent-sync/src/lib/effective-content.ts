import path from "node:path";

import { pathExists } from "./fs-utils";
import { resolvePluginContentLayout } from "./plugin-content";
import { scanCanonicalContentAtRoot } from "./scan-canonical-content";
import type { SourceContent, SourcePlugin, SyncAgent } from "./types";

function mergeContent(base: SourceContent, overlay: SourceContent): SourceContent {
  const workflows = new Map(base.workflowFiles.map((w) => [w.name, w]));
  for (const w of overlay.workflowFiles) workflows.set(w.name, w);

  const skills = new Map(base.skills.map((s) => [s.name, s]));
  for (const s of overlay.skills) skills.set(s.name, s);

  const scripts = new Map(base.scripts.map((s) => [s.name, s]));
  for (const s of overlay.scripts) scripts.set(s.name, s);

  const agents = new Map(base.agentFiles.map((a) => [a.name, a]));
  for (const a of overlay.agentFiles) agents.set(a.name, a);

  return {
    workflowFiles: [...workflows.values()].sort((a, b) => a.name.localeCompare(b.name)),
    skills: [...skills.values()].sort((a, b) => a.name.localeCompare(b.name)),
    scripts: [...scripts.values()].sort((a, b) => a.name.localeCompare(b.name)),
    agentFiles: [...agents.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export async function effectiveContentForProvider(input: {
  agent: SyncAgent;
  sourcePlugin: SourcePlugin;
  base: SourceContent;
}): Promise<SourceContent> {
  const layout = await resolvePluginContentLayout(input.sourcePlugin);
  const overlayRoot = layout.overlayRootAbs[input.agent];
  if (!(await pathExists(overlayRoot))) return input.base;

  const overlay = await scanCanonicalContentAtRoot(overlayRoot, layout.includeByProvider[input.agent]);
  return mergeContent(input.base, overlay);
}

export function resolveDefaultCoworkOutDir(workspaceRoot: string): string {
  return path.join(workspaceRoot, "dist", "cowork", "plugins");
}

