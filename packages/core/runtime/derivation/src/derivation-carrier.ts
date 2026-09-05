export const handoffCarrier = Symbol("habitat.runtime-derivation.handoff");

export interface RuntimeDerivationHandoffCarrier {
  readonly [handoffCarrier]: unknown;
}
