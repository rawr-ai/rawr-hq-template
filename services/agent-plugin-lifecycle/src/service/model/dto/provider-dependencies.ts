import { NativeAgentProviderIdSchema } from "@rawr/resource-native-agent-provider";
import { ReadonlyObject, type Static, Type } from "typebox";

import { CanonicalAbsoluteLocatorSchema } from "./releases/content-workspace";

export const NativeProviderSessionTargetSchema = ReadonlyObject(
  Type.Object({
    provider: NativeAgentProviderIdSchema,
    home: CanonicalAbsoluteLocatorSchema,
  }),
  { additionalProperties: false }
);

export const NativeProviderSessionObservationSchema = ReadonlyObject(
  Type.Object({
    provider: NativeAgentProviderIdSchema,
    executablePath: CanonicalAbsoluteLocatorSchema,
    home: CanonicalAbsoluteLocatorSchema,
  }),
  { additionalProperties: false }
);

export type NativeProviderSessionTarget = Static<typeof NativeProviderSessionTargetSchema>;
export type NativeProviderSessionObservation = Static<
  typeof NativeProviderSessionObservationSchema
>;
