import { Type } from "typebox";
import type { RuntimeSchema } from "@rawr/sdk/runtime/schema";
import type { ExecutionDescriptor } from "@rawr/sdk/spine";
import { InngestFunctionProbe } from "../../src/vendor/boundaries/inngest";

declare function requiresRuntimeSchema(schema: RuntimeSchema<string>): void;

// @ts-expect-error raw TypeBox schemas must be adapted before becoming RuntimeSchema.
requiresRuntimeSchema(Type.String());

// @ts-expect-error Inngest functions are host callbacks, not RAWR execution descriptors.
const descriptor: ExecutionDescriptor = InngestFunctionProbe;

void descriptor;
