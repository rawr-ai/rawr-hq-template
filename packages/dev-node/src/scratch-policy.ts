import type { ScratchPolicyInput } from "@rawr/dev/types";
import { createNodeDevResources } from "./resources";

function normalizeMode(value: string | undefined): ScratchPolicyInput["mode"] | undefined {
  if (value === "off" || value === "warn" || value === "block") return value;
  return undefined;
}

export async function resolveNodeScratchPolicyInput(input: {
  workspaceRoot: string;
  env?: NodeJS.ProcessEnv;
}): Promise<ScratchPolicyInput> {
  const env = input.env ?? process.env;
  if (env.RAWR_SKIP_SCRATCH_POLICY === "1") return { bypassed: true };

  const envMode = normalizeMode(env.RAWR_SCRATCH_POLICY_MODE);
  if (envMode) return { mode: envMode };

  const resources = createNodeDevResources(env);
  const gitConfig = await resources.process.exec("git", ["config", "--get", "rawr.scratchPolicyMode"], {
    cwd: input.workspaceRoot,
  });
  if (gitConfig.exitCode === 0) {
    const mode = normalizeMode(new TextDecoder().decode(gitConfig.stdout).trim());
    if (mode) return { mode };
  }

  return {};
}
