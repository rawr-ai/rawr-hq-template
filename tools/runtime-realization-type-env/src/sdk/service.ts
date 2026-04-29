import type { EffectBody, RawrEffect } from "./effect";
import type { ExecutionDescriptor } from "../spine/artifacts";

export interface ServiceInvocation {
  readonly traceId: string;
  readonly actorId?: string;
}

export interface ServiceProcedure<TInput, TOutput, TError = never> {
  readonly kind: "service.procedure";
  readonly input: TInput;
  readonly output: TOutput;
  readonly error: TError;
}

export function serviceProcedure<TInput, TOutput, TError = never>(): ServiceProcedure<
  TInput,
  TOutput,
  TError
> {
  return {
    kind: "service.procedure",
    input: undefined as TInput,
    output: undefined as TOutput,
    error: undefined as TError,
  };
}

export type ServiceModule = Record<string, ServiceProcedure<unknown, unknown, unknown>>;

export type ServiceModules = Record<string, ServiceModule>;

export interface ServiceDefinition<TModules extends ServiceModules = ServiceModules> {
  readonly kind: "service.definition";
  readonly id: string;
  readonly modules: TModules;
}

export function defineService<const TModules extends ServiceModules>(input: {
  readonly id: string;
  readonly modules: TModules;
}): ServiceDefinition<TModules> {
  return {
    kind: "service.definition",
    id: input.id,
    modules: input.modules,
  };
}

export interface ServiceUse<
  TService extends ServiceDefinition<ServiceModules> = ServiceDefinition<ServiceModules>,
> {
  readonly kind: "service.use";
  readonly service: TService;
}

export type ServiceUses = Record<string, ServiceUse<ServiceDefinition<ServiceModules>>>;

export function useService<const TService extends ServiceDefinition<ServiceModules>>(
  service: TService,
): ServiceUse<TService> {
  return {
    kind: "service.use",
    service,
  };
}

export type ServiceContractOf<TUse> =
  TUse extends ServiceUse<infer TService> ? TService : never;

export type ProcedureInput<TProcedure> =
  TProcedure extends ServiceProcedure<infer TInput, unknown, unknown>
    ? TInput
    : never;

export type ProcedureOutput<TProcedure> =
  TProcedure extends ServiceProcedure<unknown, infer TOutput, unknown>
    ? TOutput
    : never;

export type ProcedureError<TProcedure> =
  TProcedure extends ServiceProcedure<unknown, unknown, infer TError>
    ? TError
    : never;

export type InvocationBoundServiceClient<
  TService extends ServiceDefinition<ServiceModules>,
> = {
  readonly [TModule in keyof TService["modules"]]: {
    readonly [TProcedure in keyof TService["modules"][TModule]]: (
      input: ProcedureInput<TService["modules"][TModule][TProcedure]>,
    ) => RawrEffect<
      ProcedureOutput<TService["modules"][TModule][TProcedure]>,
      ProcedureError<TService["modules"][TModule][TProcedure]>
    >;
  };
};

export interface ConstructionBoundServiceClient<
  TService extends ServiceDefinition<ServiceModules>,
> {
  withInvocation(input: {
    readonly invocation: ServiceInvocation;
  }): InvocationBoundServiceClient<TService>;
}

export type ConstructionBoundServiceClients<TServiceUses extends ServiceUses> = {
  readonly [TKey in keyof TServiceUses]: ConstructionBoundServiceClient<
    ServiceContractOf<TServiceUses[TKey]>
  >;
};

export type InvocationBoundEffectServiceClients<TServiceUses extends ServiceUses> = {
  readonly [TKey in keyof TServiceUses]: InvocationBoundServiceClient<
    ServiceContractOf<TServiceUses[TKey]>
  >;
};

export interface ServiceProcedureExecutionContext<TInput> {
  readonly input: TInput;
  readonly invocation: ServiceInvocation;
}

export interface ServiceProcedureImplementer<TInput, TOutput, TError = never> {
  effect<TRequirements>(
    fn: EffectBody<
      ServiceProcedureExecutionContext<TInput>,
      TOutput,
      TError,
      TRequirements
    >,
  ): ExecutionDescriptor<TInput, TOutput, TError, ServiceProcedureExecutionContext<TInput>>;
}

export type ServiceImplementer<TService extends ServiceDefinition<ServiceModules>> = {
  readonly [TModule in keyof TService["modules"]]: {
    readonly [TProcedure in keyof TService["modules"][TModule]]: ServiceProcedureImplementer<
      ProcedureInput<TService["modules"][TModule][TProcedure]>,
      ProcedureOutput<TService["modules"][TModule][TProcedure]>,
      ProcedureError<TService["modules"][TModule][TProcedure]>
    >;
  };
};

export function implementService<const TService extends ServiceDefinition<ServiceModules>>(
  service: TService,
): ServiceImplementer<TService> {
  void service;
  return new Proxy(
    {},
    {
      get() {
        return new Proxy(
          {},
          {
            get() {
              return {
                effect(fn: EffectBody<unknown, unknown>) {
                  return {
                    kind: "execution.descriptor",
                    run: fn,
                  };
                },
              };
            },
          },
        );
      },
    },
  ) as ServiceImplementer<TService>;
}
