import type { InferRouterInitialContext } from "@orpc/server";

import { type CreateClientOptions, createClient, type Invocation } from "../../../src/client";
import type { Context } from "../../../src/service/base";
import { contract } from "../../../src/service/contract";
import {
  getTodoProcedureMetadata,
  type TodoProcedureMetadata,
} from "../../../src/service/model/policy";
import { router } from "../../../src/service/router";
import { createClientOptions, invocation } from "../../support/service/helpers";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? true
    : false;
type Expect<Value extends true> = Value;
type Normalize<Value> = { [Key in keyof Value]: Value[Key] };

type RouterContext = InferRouterInitialContext<typeof router>;
type ClientBoundary = Pick<Context, "deps" | "scope" | "config">;

type RouterUsesServiceContext = Expect<Equal<Normalize<RouterContext>, Normalize<Context>>>;
type ClientUsesStableLanes = Expect<
  Equal<Normalize<CreateClientOptions>, Normalize<ClientBoundary>>
>;
type MetadataReaderPreservesDomainPolicy = Expect<
  Equal<ReturnType<typeof getTodoProcedureMetadata>, TodoProcedureMetadata | undefined>
>;

const routerUsesServiceContext: RouterUsesServiceContext = true;
const clientUsesStableLanes: ClientUsesStableLanes = true;
const metadataReaderPreservesDomainPolicy: MetadataReaderPreservesDomainPolicy = true;
void routerUsesServiceContext;
void clientUsesStableLanes;
void metadataReaderPreservesDomainPolicy;

const createTaskMetadata = getTodoProcedureMetadata(contract.tasks.create);
if (createTaskMetadata) {
  const audit: "none" | "basic" | "full" | undefined = createTaskMetadata.audit;
  const entity: "service" | "task" | "tag" | "assignment" | undefined = createTaskMetadata.entity;
  void audit;
  void entity;
}

const options = createClientOptions();
const boundary: CreateClientOptions = {
  deps: options.deps,
  scope: options.scope,
  config: options.config,
};
const client = createClient(boundary);

const callContext: Invocation = { correlationId: "trace-typing" };
void client.tasks.get(
  { id: "00000000-0000-4000-8000-000000000001" },
  { context: { invocation: callContext } }
);

const callerAuthoredTraceContext: Invocation = {
  // @ts-expect-error Invocation admits correlation identity, not caller-authored trace identity.
  traceId: "trace-typing",
};
void callerAuthoredTraceContext;

// @ts-expect-error Invocation context is a per-call lane and cannot be omitted.
void client.tasks.get({ id: "00000000-0000-4000-8000-000000000001" });

const widerCallOptions = {
  ...invocation("trace-wider"),
  signal: new AbortController().signal,
};
void client.tags.list({}, widerCallOptions);

const invalidBoundary: CreateClientOptions = {
  ...boundary,
  // @ts-expect-error Invocation facts do not belong to the stable client boundary.
  invocation: callContext,
};
void invalidBoundary;
