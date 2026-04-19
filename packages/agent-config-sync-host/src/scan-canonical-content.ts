import fs from "node:fs/promises";
import path from "node:path";

import { pathExists } from "./fs-utils";
import type { NormalizedInclude } from "./plugin-content";
import type { HostSourceContent } from "./types";

export async function scanCanonicalContentAtRoot(
  rootAbsPath: string,
  include: NormalizedInclude,
): Promise<HostSourceContent> {
  const workflowsDir = path.join(rootAbsPath, "workflows");
  const skillsDir = path.join(rootAbsPath, "skills");
  const scriptsDir = path.join(rootAbsPath, "scripts");
  const agentsDir = path.join(rootAbsPath, "agents");

  const content: HostSourceContent = {
    workflowFiles: [],
    skills: [],
    scripts: [],
    agentFiles: [],
  };

  if (include.workflows && (await pathExists(workflowsDir))) {
    const dirents = await fs.readdir(workflowsDir, { withFileTypes: true });
    for (const dirent of dirents) {
      if (!dirent.isFile()) continue;
      if (!dirent.name.endsWith(".md")) continue;
      content.workflowFiles.push({
        name: dirent.name.slice(0, -3),
        absPath: path.join(workflowsDir, dirent.name),
      });
    }
  }

  if (include.skills && (await pathExists(skillsDir))) {
    const dirents = await fs.readdir(skillsDir, { withFileTypes: true });
    for (const dirent of dirents) {
      if (!dirent.isDirectory()) continue;
      const skillDir = path.join(skillsDir, dirent.name);
      if (!(await pathExists(path.join(skillDir, "SKILL.md")))) continue;
      content.skills.push({ name: dirent.name, absPath: skillDir });
    }
  }

  if (include.scripts && (await pathExists(scriptsDir))) {
    const dirents = await fs.readdir(scriptsDir, { withFileTypes: true });
    for (const dirent of dirents) {
      if (!dirent.isFile()) continue;
      content.scripts.push({
        name: dirent.name,
        absPath: path.join(scriptsDir, dirent.name),
      });
    }
  }

  if (include.agents && (await pathExists(agentsDir))) {
    const dirents = await fs.readdir(agentsDir, { withFileTypes: true });
    for (const dirent of dirents) {
      if (!dirent.isFile()) continue;
      if (!dirent.name.endsWith(".md")) continue;
      content.agentFiles.push({
        name: dirent.name.slice(0, -3),
        absPath: path.join(agentsDir, dirent.name),
      });
    }
  }

  content.workflowFiles.sort((a, b) => a.name.localeCompare(b.name));
  content.skills.sort((a, b) => a.name.localeCompare(b.name));
  content.scripts.sort((a, b) => a.name.localeCompare(b.name));
  content.agentFiles.sort((a, b) => a.name.localeCompare(b.name));

  return content;
}
