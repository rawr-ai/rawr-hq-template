import {
  createGovernanceCurrentMainResolver,
  type GovernanceLifecycleRuntime,
} from "@rawr/agent-plugin-lifecycle/bindings/governance";
import {
  createCanonicalChannelReader,
} from "@rawr/agent-plugin-lifecycle/bindings/providers";

export function createGovernanceCanonicalChannelReader(input: Readonly<{
  governance: GovernanceLifecycleRuntime;
}>) {
  return createCanonicalChannelReader(
    createGovernanceCurrentMainResolver(input.governance),
  );
}
