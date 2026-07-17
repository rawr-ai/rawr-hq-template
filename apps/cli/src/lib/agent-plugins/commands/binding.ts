import type { Client } from "@rawr/agent-plugin-lifecycle/client";

export type LifecycleOperation =
  | "releases.check"
  | "releases.build"
  | "vendors.status"
  | "vendors.update"
  | "packaging.package"
  | "exports.apply"
  | "providers.targetedTest"
  | "providers.completeTest"
  | "providers.canonicalSync"
  | "providers.canonicalStatus"
  | "providers.managedRetire"
  | "governance.attestPromotion";

export type ControllerProjectionBinding = Readonly<{
  gitExecutable?: string;
  hostedGovernanceExecutable?: string;
  providerExecutables: Readonly<Partial<Record<"claude" | "codex", string>>>;
}>;

export type LifecycleClientFactory = (
  operation: LifecycleOperation,
  binding: ControllerProjectionBinding,
) => Client | Promise<Client>;

export class LifecycleAuthorityBindingError extends Error {
  readonly code = "LIFECYCLE_AUTHORITY_BINDING_INVALID";

  constructor(message: string) {
    super(message);
    this.name = "LifecycleAuthorityBindingError";
  }
}
