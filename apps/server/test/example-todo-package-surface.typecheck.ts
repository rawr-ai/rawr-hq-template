// @ts-expect-error The package has no bare-root public face.
import * as retiredRootSurface from "@rawr/example-todo";
import {
  type Client,
  type Config,
  type Contract,
  type CreateClientOptions,
  contract,
  createClient,
  type Deps,
  type Invocation,
  type Scope,
} from "@rawr/example-todo/client";
// @ts-expect-error The executable router stays private behind client construction.
import * as retiredRouterSurface from "@rawr/example-todo/router";
// @ts-expect-error The contract is re-exported only through the client face.
import * as retiredContractSurface from "@rawr/example-todo/service/contract";
// @ts-expect-error The parallel types facade is retired.
import * as retiredTypesSurface from "@rawr/example-todo/types";

const exampleTodoContract: Contract = contract;
void exampleTodoContract;

const constructExampleTodoClient: (options: CreateClientOptions) => Client = createClient;
void constructExampleTodoClient;

declare const exampleTodoOptions: CreateClientOptions;
const exampleTodoDeps: Deps = exampleTodoOptions.deps;
const exampleTodoScope: Scope = exampleTodoOptions.scope;
const exampleTodoConfig: Config = exampleTodoOptions.config;
declare const exampleTodoInvocation: Invocation;
void exampleTodoDeps;
void exampleTodoScope;
void exampleTodoConfig;
void exampleTodoInvocation;

type ClientSurface = typeof import("@rawr/example-todo/client");
type PublicValuesAreExact =
  Exclude<keyof ClientSurface, "contract" | "createClient"> extends never
    ? Exclude<"contract" | "createClient", keyof ClientSurface> extends never
      ? true
      : never
    : never;
const publicValuesAreExact: PublicValuesAreExact = true;
void publicValuesAreExact;

// @ts-expect-error The executable router type is not a public client symbol.
type RetiredRouter = import("@rawr/example-todo/client").Router;
// @ts-expect-error The service authoring surface remains private to the service spine.
type RetiredService = import("@rawr/example-todo/client").Service;
// @ts-expect-error Composed execution context remains private to the service spine.
type RetiredExecutionContext = import("@rawr/example-todo/client").ExecutionContext;

type RetiredClientSymbols = [RetiredRouter, RetiredService, RetiredExecutionContext];
declare const retiredClientSymbols: RetiredClientSymbols;
void retiredClientSymbols;

void retiredRootSurface;
void retiredRouterSurface;
void retiredContractSurface;
void retiredTypesSurface;
