declare module "bun:ffi" {
  type FfiArgument = number | Uint8Array;
  type FfiReturn = number | null;
  type FfiCallable = (...args: FfiArgument[]) => FfiReturn;

  export function dlopen(
    name: string,
    symbols: Readonly<
      Record<
        string,
        Readonly<{
          args: readonly string[];
          returns: string;
        }>
      >
    >
  ): Readonly<{
    symbols: Readonly<Record<string, FfiCallable>>;
    close(): void;
  }>;

  export namespace read {
    function i32(pointer: number): number;
  }
}
