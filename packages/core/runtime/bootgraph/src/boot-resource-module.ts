import { ReadonlyObject, type Static, type TSchema, Type } from "typebox";

import { ProviderDependencyNodeSchema } from "../../compiler/src";
import { BootResourceKeySchema } from "./boot-resource-key";

const closedBootgraph = { additionalProperties: false } as const;
const immutable = <T extends TSchema>(schema: T) => ReadonlyObject(Type.Array(schema));

export const BootResourceModuleSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("boot.resource-module"),
    key: BootResourceKeySchema,
    providerId: Type.Index(ProviderDependencyNodeSchema, ["providerId"]),
    dependencies: immutable(BootResourceKeySchema),
  }),
  closedBootgraph
);

export type BootResourceModule = Static<typeof BootResourceModuleSchema>;
