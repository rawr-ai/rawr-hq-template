export const asyncPayloadTypeId: unique symbol = Symbol("habitat.inngest-mount-payload");

/** Vendor-free identity of one process-owned, selected async surface. */
export interface InngestMountPayload {
  readonly kind: "harness.inngest.function-bundle";
  readonly appId: string;
  readonly processId: string;
  readonly functionIds: readonly string[];
  readonly [asyncPayloadTypeId]: true;
}
