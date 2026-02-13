import { oc, type Schema, type SchemaIssue } from "@orpc/contract";
import { Type, type Static, type TSchema } from "typebox";
import { Value } from "typebox/value";
import type { RepoState } from "../types.js";

export const GetRuntimeStateInputSchema = Type.Object({}, { additionalProperties: false });

export const RuntimeStateSchema = Type.Unsafe<RepoState>(
  Type.Object(
    {
      version: Type.Literal(1),
      plugins: Type.Object(
        {
          enabled: Type.Array(Type.String()),
          disabled: Type.Optional(Type.Array(Type.String())),
          lastUpdatedAt: Type.String(),
        },
        { additionalProperties: false },
      ),
    },
    { additionalProperties: false },
  ),
);

export const GetRuntimeStateOutputSchema = Type.Object(
  { state: RuntimeStateSchema },
  { additionalProperties: false },
);

function parseIssuePath(instancePath: unknown): PropertyKey[] | undefined {
  if (typeof instancePath !== "string") return undefined;
  if (instancePath === "" || instancePath === "/") return undefined;
  const segments = instancePath
    .split("/")
    .slice(1)
    .map((segment) => decodeURIComponent(segment.replace(/~1/g, "/").replace(/~0/g, "~")))
    .map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment));
  return segments.length > 0 ? segments : undefined;
}

function typeBoxStandardSchema<T extends TSchema>(schema: T): Schema<Static<T>, Static<T>> {
  return {
    "~standard": {
      version: 1,
      vendor: "typebox",
      validate: (value) => {
        if (Value.Check(schema, value)) {
          return { value: value as Static<T> };
        }

        const issues = [...Value.Errors(schema, value)].map((issue) => {
          const path = parseIssuePath((issue as { instancePath?: unknown }).instancePath);
          return path ? ({ message: issue.message, path } satisfies SchemaIssue) : ({ message: issue.message } satisfies SchemaIssue);
        });

        return {
          issues: issues.length > 0 ? issues : [{ message: "Validation failed" }],
        };
      },
    },
    __typebox: schema,
  } as Schema<Static<T>, Static<T>>;
}

const stateTag = ["state"] as const;

export const stateContract = oc.router({
  getRuntimeState: oc
    .route({
      method: "GET",
      path: "/state/runtime",
      tags: stateTag,
      summary: "Read runtime plugin state",
      operationId: "stateGetRuntimeState",
    })
    .input(typeBoxStandardSchema(GetRuntimeStateInputSchema))
    .output(typeBoxStandardSchema(GetRuntimeStateOutputSchema)),
});

export type StateContract = typeof stateContract;
