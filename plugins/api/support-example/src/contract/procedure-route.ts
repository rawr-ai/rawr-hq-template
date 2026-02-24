import { oc, type AnyContractProcedure, type Route } from "@orpc/contract";

type ProcedureDef = AnyContractProcedure["~orpc"];

/**
 * Reuse input/output/error definitions from an existing contract procedure,
 * while attaching API route metadata for OpenAPI exposure.
 */
export function withApiRoute<TProcedure extends AnyContractProcedure>(
  procedure: TProcedure,
  route: Route,
): TProcedure {
  const def: ProcedureDef = procedure["~orpc"];

  let builder: any = oc.route(route).errors(def.errorMap);

  if (def.inputSchema) {
    builder = builder.input(def.inputSchema);
  }

  if (def.outputSchema) {
    builder = builder.output(def.outputSchema);
  }

  return builder as unknown as TProcedure;
}
