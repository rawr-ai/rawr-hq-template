import type { AgentConfigSyncResources } from "../../resources";
import type { SourceContent } from "../../entities";
import type { NormalizedPluginContentInclude } from "../entities";

/**
 * Scans a canonical source-content root into the service's normalized content
 * model. This owns layout interpretation for workflows, skills, scripts, and
 * agents instead of leaving CLI resources to duplicate directory policy.
 */
export async function scanCanonicalContentAtRoot(input: {
  rootAbsPath: string;
  include: NormalizedPluginContentInclude;
  resources: AgentConfigSyncResources;
}): Promise<SourceContent> {
  const workflowsDir = input.resources.path.join(input.rootAbsPath, "workflows");
  const skillsDir = input.resources.path.join(input.rootAbsPath, "skills");
  const scriptsDir = input.resources.path.join(input.rootAbsPath, "scripts");
  const agentsDir = input.resources.path.join(input.rootAbsPath, "agents");

  const content: SourceContent = {
    workflowFiles: [],
    skills: [],
    scripts: [],
    agentFiles: [],
  };

  if (input.include.workflows && (await input.resources.files.pathExists(workflowsDir))) {
    for (const dirent of await input.resources.files.readDir(workflowsDir)) {
      if (dirent.isDirectory || !dirent.name.endsWith(".md")) continue;
      content.workflowFiles.push({
        name: dirent.name.slice(0, -3),
        absPath: input.resources.path.join(workflowsDir, dirent.name),
      });
    }
  }

  if (input.include.skills && (await input.resources.files.pathExists(skillsDir))) {
    for (const dirent of await input.resources.files.readDir(skillsDir)) {
      if (!dirent.isDirectory) continue;
      const skillDir = input.resources.path.join(skillsDir, dirent.name);
      if (!(await input.resources.files.pathExists(input.resources.path.join(skillDir, "SKILL.md")))) continue;
      content.skills.push({ name: dirent.name, absPath: skillDir });
    }
  }

  if (input.include.scripts && (await input.resources.files.pathExists(scriptsDir))) {
    for (const dirent of await input.resources.files.readDir(scriptsDir)) {
      if (dirent.isDirectory) continue;
      content.scripts.push({
        name: dirent.name,
        absPath: input.resources.path.join(scriptsDir, dirent.name),
      });
    }
  }

  if (input.include.agents && (await input.resources.files.pathExists(agentsDir))) {
    for (const dirent of await input.resources.files.readDir(agentsDir)) {
      if (dirent.isDirectory || !dirent.name.endsWith(".md")) continue;
      content.agentFiles.push({
        name: dirent.name.slice(0, -3),
        absPath: input.resources.path.join(agentsDir, dirent.name),
      });
    }
  }

  content.workflowFiles.sort((a, b) => a.name.localeCompare(b.name));
  content.skills.sort((a, b) => a.name.localeCompare(b.name));
  content.scripts.sort((a, b) => a.name.localeCompare(b.name));
  content.agentFiles.sort((a, b) => a.name.localeCompare(b.name));

  return content;
}
