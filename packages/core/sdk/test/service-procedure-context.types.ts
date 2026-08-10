import type { ServiceBoundaryContext, ServiceModuleContextProjection } from "../src/service";

type TypesEqual<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends <T>() => T extends TRight ? 1 : 2
    ? (<T>() => T extends TRight ? 1 : 2) extends <T>() => T extends TLeft ? 1 : 2
      ? true
      : false
    : false;

type Assert<T extends true> = T;

declare const moduleProjectionKey: unique symbol;

type BoundaryContext = ServiceBoundaryContext<
  { readonly catalog: "catalog" },
  { readonly workspaceId: "workspace" },
  { readonly profile: "profile" },
  { readonly requestId: "request" },
  { readonly actor: "actor" }
>;

type ValidModuleProjection = {
  readonly inventory: { readonly current: () => string };
  readonly selection?: "primary";
  readonly [moduleProjectionKey]: "private";
};

type MixedModuleProjection =
  | { readonly inventory: object }
  | { readonly inventory: object; readonly scope: object };

export type ServiceProcedureContextTypeOracle = readonly [
  Assert<
    TypesEqual<
      BoundaryContext,
      {
        readonly deps: { readonly catalog: "catalog" };
        readonly scope: { readonly workspaceId: "workspace" };
        readonly config: { readonly profile: "profile" };
        readonly invocation: { readonly requestId: "request" };
        readonly provided: { readonly actor: "actor" };
      }
    >
  >,
  Assert<TypesEqual<ServiceModuleContextProjection<ValidModuleProjection>, ValidModuleProjection>>,
  Assert<TypesEqual<ServiceModuleContextProjection<{ readonly deps: object }>, never>>,
  Assert<TypesEqual<ServiceModuleContextProjection<{ readonly scope: object }>, never>>,
  Assert<TypesEqual<ServiceModuleContextProjection<{ readonly config: object }>, never>>,
  Assert<TypesEqual<ServiceModuleContextProjection<{ readonly invocation: object }>, never>>,
  Assert<TypesEqual<ServiceModuleContextProjection<{ readonly provided: object }>, never>>,
  Assert<TypesEqual<ServiceModuleContextProjection<{ readonly deps?: object }>, never>>,
  Assert<TypesEqual<ServiceModuleContextProjection<MixedModuleProjection>, never>>,
  Assert<TypesEqual<ServiceModuleContextProjection<Readonly<Record<string, unknown>>>, never>>,
];

if (false) {
  const boundaryContext = undefined as unknown as BoundaryContext;

  // @ts-expect-error Boundary dependency identity is readonly.
  boundaryContext.deps = { catalog: "catalog" };
  // @ts-expect-error Boundary scope identity is readonly.
  boundaryContext.scope = { workspaceId: "workspace" };
  // @ts-expect-error Boundary configuration is readonly.
  boundaryContext.config = { profile: "profile" };
  // @ts-expect-error Boundary invocation identity is readonly.
  boundaryContext.invocation = { requestId: "request" };
  // @ts-expect-error Boundary-provided capabilities are readonly.
  boundaryContext.provided = { actor: "actor" };
}
