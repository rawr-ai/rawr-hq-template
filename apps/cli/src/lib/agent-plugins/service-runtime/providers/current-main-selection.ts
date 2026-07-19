import {
  createGovernanceCurrentMainResolver,
  type GovernanceLifecycleRuntime,
} from "@rawr/agent-plugin-lifecycle/bindings/governance";
import {
  createCurrentMainSelectionReader,
} from "@rawr/agent-plugin-lifecycle/bindings/providers";

/** Projects governance's sole Git selector into canonical provider operations. */
export function createGovernanceCurrentMainSelectionReader(input: Readonly<{
  governance: Pick<GovernanceLifecycleRuntime, "git">;
}>) {
  return createCurrentMainSelectionReader(
    createGovernanceCurrentMainResolver(input.governance),
  );
}
