import { type ServiceDefinition, sealService } from "../../../definition/src/index";

/** A native contract whose constructor must remain unreachable during cold proof. */
export function coldService<const TDefinition extends ServiceDefinition>(definition: TDefinition) {
  return sealService(definition, {
    contract: definition.oc.router({}),
    construct: () => {
      throw new Error("Cold derivation must not construct a service.");
    },
  });
}
