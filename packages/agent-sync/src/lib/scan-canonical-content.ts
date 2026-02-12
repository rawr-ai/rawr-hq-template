import fs from "node:fs/promises";
import path from "node:path";

import { pathExists } from "./fs-utils";
import type { NormalizedInclude } from "./plugin-content";
import type { SourceContent } from "./types";

export async function scanCanonicalContentAtRoot(rootAbs: string, include: NormalizedInclude): Promise<SourceContent> {
  const workflowsDir = path.join(rootAbs, "workflows");
  const skillsDir = path.join(rootAbs, "skills");
  const scriptsDir = path.join(rootAbs, "scripts");
  const agentsDir = path.join(rootAbs, "agents");

  const content: SourceContent = {
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
      const skillAbs = path.join(skillsDir, dirent.name);
      if (!(await pathExists(path.join(skillAbs, "SKILL.md")))) continue;
      content.skills.push({ name: dirent.name, absPath: skillAbs });
    }
  }

  if (include.scripts && (await pathExists(scriptsDir))) {
    const dirents = await fs.readdir(scriptsDir, { withFileTypes: true });
    for (const dirent of dirents) {
      if (!dirent.isFile()) continue;
      content.scripts.push({ name: dirent.name, absPath: path.join(scriptsDir, dirent.name) });
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

