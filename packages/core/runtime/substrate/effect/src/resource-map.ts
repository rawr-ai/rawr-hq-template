import type {
  ResourceRequirement,
  RuntimeResource,
  RuntimeResourceMap,
  RuntimeResourceValue,
} from "../../../definition/src/index";

/** Capability lookup is reference-based; normalized identities are joined before assembly. */
export function createResourceMap(
  entries: readonly (readonly [ResourceRequirement, unknown])[]
): RuntimeResourceMap {
  const values = new Map(entries);
  return Object.freeze({
    has: (requirement: ResourceRequirement): boolean => values.has(requirement),
    get<TResource extends RuntimeResource>(
      requirement: ResourceRequirement<TResource>
    ): RuntimeResourceValue<TResource> {
      if (!values.has(requirement) && requirement.optional !== true) {
        throw new TypeError("Required resource is not available through this declared reference.");
      }
      return values.get(requirement) as RuntimeResourceValue<TResource>;
    },
  });
}
