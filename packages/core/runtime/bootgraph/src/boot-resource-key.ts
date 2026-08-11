import { ReadonlyObject, type Static, Type } from "typebox";

import { ProviderDependencyNodeSchema } from "../../compiler/src";

const closedBootgraph = { additionalProperties: false } as const;
const ProviderResourceSchema = Type.Index(ProviderDependencyNodeSchema, ["resource"]);

export const BootResourceKeySchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("boot.resource-key"),
    selectionId: Type.Index(ProviderDependencyNodeSchema, ["selectionId"]),
    resourceId: Type.Index(ProviderResourceSchema, ["resourceId"]),
    lifetime: Type.Index(ProviderResourceSchema, ["lifetime"]),
    role: Type.Optional(Type.Index(ProviderResourceSchema, ["role"])),
    instance: Type.Optional(Type.Index(ProviderResourceSchema, ["instance"])),
  }),
  closedBootgraph
);

export type BootResourceKey = Static<typeof BootResourceKeySchema>;
