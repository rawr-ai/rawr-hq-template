import type { GetFunctionInput, Inngest, InngestFunction, Middleware } from "inngest";

import {
  type AsyncStepMembership,
  type AsyncStepResult,
  attachAsyncStepBridge,
} from "../../definition/src/async-context";
import type {
  RuntimeAsyncDeclarationSource,
  RuntimeAsyncSource,
} from "../../derivation/src/async-source";
import { asyncPayloadTypeId, type InngestMountPayload } from "./async-payload";
import type { CompiledExecutableBoundary, ExecutionRegistry } from "./execution-registry";
import type { ProcessExecutionAssembly } from "./execution-runtime";
import type { Continuation, InvocationTracker } from "./invocation-tracker";

interface BundleInput {
  readonly appId: string;
  readonly processId: string;
  readonly source: RuntimeAsyncSource;
  readonly registry: ExecutionRegistry;
  readonly admission: InvocationTracker;
  readonly execution: ProcessExecutionAssembly;
}

export interface InngestFunctionCohort {
  readonly functions: readonly InngestFunction.Any[];
  trackHandler<T>(request: Request, operation: () => Promise<T>): Promise<T>;
  closeAndDrain(): Promise<void>;
  uninstallMiddleware(): void;
}

type Step = AsyncStepMembership[number];
type Boundary = CompiledExecutableBoundary<unknown, unknown, unknown, unknown>;
const nativeInvocation = Symbol("habitat.inngest-native-invocation");

class NativeInvocation {
  constructor(
    readonly cohort: object,
    readonly fn: object,
    readonly continuation: Continuation
  ) {
    Object.freeze(this);
  }
}

class Bundle implements InngestMountPayload {
  readonly kind = "harness.inngest.function-bundle";
  readonly [asyncPayloadTypeId] = true;
  readonly appId: string;
  readonly processId: string;
  readonly functionIds: readonly string[];
  readonly #input: BundleInput;
  readonly #boundaries: ReadonlyMap<RuntimeAsyncDeclarationSource, ReadonlyMap<Step, Boundary>>;
  #materialized = false;

  constructor(input: BundleInput) {
    this.#input = input;
    this.appId = input.appId;
    this.processId = input.processId;
    this.functionIds = Object.freeze(
      input.source.declarations.map((declaration) => declaration.id)
    );
    if (new Set(this.functionIds).size !== this.functionIds.length)
      throw new TypeError("A native Inngest bundle contains duplicate function ids.");
    this.#boundaries = new Map(
      input.source.declarations.map((declaration) => [
        declaration,
        new Map(
          declaration.descriptorReferences.map(([descriptor, ref]) => [
            descriptor,
            input.registry.get<unknown, unknown, unknown, unknown>(ref),
          ])
        ),
      ])
    );
    Object.freeze(this);
  }

  #invoke(
    declaration: RuntimeAsyncDeclarationSource,
    native: GetFunctionInput<Inngest>,
    parent: Continuation
  ): unknown {
    const schema =
      declaration.kind === "async.workflow"
        ? declaration.inputSchema
        : declaration.kind === "async.consumer"
          ? declaration.eventSchema
          : undefined;
    const decoded = schema?.decode(native.event.data);
    if (decoded?.success === false)
      throw new TypeError("Native async event data failed its owning schema.");
    const event = {
      ...native.event,
      data: decoded === undefined ? native.event.data : decoded.value,
    };
    const boundaries = this.#boundaries.get(declaration);
    if (boundaries === undefined) throw new TypeError("Native async declaration is not selected.");
    const context = attachAsyncStepBridge(
      { ...native, event },
      {
        run: <D extends Step>(descriptor: D): Promise<AsyncStepResult<D>> => {
          this.#input.admission.assertAdmission(parent);
          const boundary = boundaries.get(descriptor);
          if (boundary === undefined)
            throw new TypeError(
              "Async step requires an exact descriptor declared by this function."
            );
          const result = native.step.run(descriptor.id, () =>
            this.#input.execution.executeWithin(parent, {
              boundary,
              invocation: { input: event.data, context: { event: event.data } },
            })
          );
          // The table erases success types; native step.run owns standard-JSON projection and replay.
          return result as Promise<AsyncStepResult<D>>;
        },
      }
    );
    return declaration.run(context);
  }

  static read(payload: InngestMountPayload): Bundle {
    if (typeof payload !== "object" || payload === null || !(#input in payload))
      throw new TypeError("Inngest mounting requires an exact process-owned function bundle.");
    return payload;
  }

  static async materialize(
    payloads: readonly InngestMountPayload[],
    client: Inngest
  ): Promise<InngestFunctionCohort> {
    const bundles = payloads.map(Bundle.read);
    const first = bundles[0];
    if (first === undefined) throw new TypeError("An Inngest cohort requires a selected bundle.");
    const admission = first.#input.admission;
    admission.assertOpen();
    const ids = new Set<string>();
    for (const bundle of bundles) {
      if (bundle.#input.admission !== admission || bundle.#materialized)
        throw new TypeError("Inngest requires unclaimed bundles from one exact process.");
      for (const id of bundle.functionIds) {
        if (ids.has(id))
          throw new TypeError("Selected Inngest functions have duplicate native ids.");
        ids.add(id);
      }
    }
    for (const bundle of bundles) bundle.#materialized = true;
    const { Middleware } = await import("inngest");
    admission.assertOpen();
    const group = admission.group();
    const cohort = Object.freeze({});
    const functions = new Set<object>();
    const requests = new WeakMap<object, Continuation>();
    class InvocationMiddleware extends Middleware.BaseMiddleware {
      readonly id = "habitat.native-invocation";
      #continuation: Continuation | undefined;

      wrapRequest(args: Middleware.WrapRequestArgs): Promise<Middleware.Response> {
        if (args.fn === null || !functions.has(args.fn)) return args.next();
        const request = args.requestArgs[0];
        const parent =
          typeof request === "object" && request !== null ? requests.get(request) : undefined;
        return group.run(async (continuation) => {
          this.#continuation = continuation;
          return args.next();
        }, parent);
      }

      transformFunctionInput(
        args: Middleware.TransformFunctionInputArgs
      ): Middleware.TransformFunctionInputArgs {
        if (!functions.has(args.fn)) return args;
        if (this.#continuation === undefined)
          throw new TypeError("Native async execution is outside its admitted request.");
        const witness = new NativeInvocation(cohort, args.fn, this.#continuation);
        // Enumerable symbol survives ordinary native middleware context copies without a public key.
        const ctx = { ...args.ctx, [nativeInvocation]: witness };
        return { ...args, ctx };
      }
    }
    function continuation(context: object, fn: object): Continuation {
      const witness: unknown = Reflect.get(context, nativeInvocation);
      if (!(witness instanceof NativeInvocation) || witness.cohort !== cohort || witness.fn !== fn)
        throw new TypeError("Native async callback requires its exact admitted invocation.");
      const parent = witness.continuation;
      admission.assertAdmission(parent);
      return parent;
    }
    const uninstallMiddleware = () => {
      const index = client.middleware.indexOf(InvocationMiddleware);
      if (index !== -1) client.middleware.splice(index, 1);
    };
    client.middleware.unshift(InvocationMiddleware);
    try {
      const materialized = bundles.flatMap((bundle) =>
        bundle.#input.source.declarations.map((declaration) => {
          const onFailure = declaration.options?.onFailure;
          const fn: InngestFunction.Any = client.createFunction(
            {
              ...declaration.options,
              ...(onFailure === undefined
                ? {}
                : {
                    onFailure: (context: Parameters<typeof onFailure>[0]) => {
                      continuation(context, fn);
                      return onFailure(context);
                    },
                  }),
              id: declaration.id,
              triggers:
                declaration.kind === "async.schedule"
                  ? [{ cron: declaration.cron }]
                  : [{ event: declaration.eventName }],
            },
            (native) => bundle.#invoke(declaration, native, continuation(native, fn))
          );
          functions.add(fn);
          return fn;
        })
      );
      return Object.freeze({
        functions: Object.freeze(materialized),
        trackHandler<T>(request: Request, operation: () => Promise<T>): Promise<T> {
          return group.run(async (parent) => {
            requests.set(request, parent);
            try {
              return await operation();
            } finally {
              requests.delete(request);
            }
          });
        },
        closeAndDrain: group.closeAndDrain,
        uninstallMiddleware,
      });
    } catch (error) {
      await group.closeAndDrain();
      uninstallMiddleware();
      throw error;
    }
  }
}

export function createInngestFunctionBundle(input: BundleInput): InngestMountPayload {
  return new Bundle(input);
}

export function readInngestFunctionBundle(payload: InngestMountPayload): InngestMountPayload {
  return Bundle.read(payload);
}

export function materializeInngestFunctions(
  payloads: readonly InngestMountPayload[],
  input: { readonly client: Inngest }
): Promise<InngestFunctionCohort> {
  return Bundle.materialize(payloads, input.client);
}
