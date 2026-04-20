import type { SourceContent } from "../../../shared/schemas";

export function mergeSourceContent(base: SourceContent, overlay: SourceContent): SourceContent {
  const workflows = new Map(base.workflowFiles.map((workflow) => [workflow.name, workflow]));
  for (const workflow of overlay.workflowFiles) workflows.set(workflow.name, workflow);

  const skills = new Map(base.skills.map((skill) => [skill.name, skill]));
  for (const skill of overlay.skills) skills.set(skill.name, skill);

  const scripts = new Map(base.scripts.map((script) => [script.name, script]));
  for (const script of overlay.scripts) scripts.set(script.name, script);

  const agents = new Map(base.agentFiles.map((agent) => [agent.name, agent]));
  for (const agent of overlay.agentFiles) agents.set(agent.name, agent);

  return {
    workflowFiles: [...workflows.values()].sort((a, b) => a.name.localeCompare(b.name)),
    skills: [...skills.values()].sort((a, b) => a.name.localeCompare(b.name)),
    scripts: [...scripts.values()].sort((a, b) => a.name.localeCompare(b.name)),
    agentFiles: [...agents.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
}

