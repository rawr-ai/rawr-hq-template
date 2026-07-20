/** Refuses a native mutation before the native bridge is invoked. */
export class NativeProviderPreMutationRefusal extends Error {
  readonly _tag = "NativeProviderPreMutationRefusal" as const;

  constructor(detail: string) {
    super(detail);
    this.name = "NativeProviderPreMutationRefusal";
  }
}
