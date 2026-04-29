import type { RuntimeDiagnostic } from "../spine/artifacts";
import type { RuntimeProfile } from "../sdk/runtime/profiles";

export function validateProviderClosure(profile: RuntimeProfile): RuntimeDiagnostic[] {
  const selectedResourceIds = new Set(
    profile.providerSelections.map((selection) => selection.resource.id),
  );

  return profile.providerSelections.flatMap((selection) =>
    selection.provider.requires
      .filter(
        (requirement) =>
          !requirement.optional && !selectedResourceIds.has(requirement.resource.id),
      )
      .map((requirement) => ({
        code: "runtime.provider.missing-required-resource",
        message: `provider ${selection.provider.id} requires ${requirement.resource.id}, but the profile does not select a provider for it`,
      })),
  );
}
