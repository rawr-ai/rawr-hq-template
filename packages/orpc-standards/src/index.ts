import type { Schema, SchemaIssue } from "@orpc/contract";
import type { Static, TSchema } from "typebox";
import { Value } from "typebox/value";

function decodePathSegment(segment: string): string {
  return decodeURIComponent(segment.replace(/~1/g, "/").replace(/~0/g, "~"));
}

function parseIssuePath(instancePath: unknown): PropertyKey[] | undefined {
  if (typeof instancePath !== "string") return undefined;
  if (instancePath === "" || instancePath === "/") return undefined;

  const segments = instancePath
    .split("/")
    .slice(1)
    .map((segment) => decodePathSegment(segment))
    .map((segment) => (/^\d+$/u.test(segment) ? Number(segment) : segment));

  return segments.length > 0 ? segments : undefined;
}

export function typeBoxStandardSchema<T extends TSchema>(typeboxSchema: T): Schema<Static<T>, Static<T>> {
  return {
    "~standard": {
      version: 1,
      vendor: "typebox",
      validate: (value) => {
        if (Value.Check(typeboxSchema, value)) {
          return { value: value as Static<T> };
        }

        const issues = [...Value.Errors(typeboxSchema, value)].map((issue) => {
          const path = parseIssuePath((issue as { instancePath?: unknown }).instancePath);
          return path ? ({ message: issue.message, path } satisfies SchemaIssue) : ({ message: issue.message } satisfies SchemaIssue);
        });

        return {
          issues: issues.length > 0 ? issues : [{ message: "Validation failed" }],
        };
      },
    },
    __typebox: typeboxSchema,
  } as Schema<Static<T>, Static<T>>;
}

export function schema<T extends TSchema>(typeboxSchema: T): Schema<Static<T>, Static<T>> {
  return typeBoxStandardSchema(typeboxSchema);
}

export type DomainErrorCatalog = Record<
  string,
  {
    status: number;
    message: string;
    data: TSchema;
  }
>;

export type DomainErrorDetailsByCode<TCatalog extends DomainErrorCatalog> = {
  [Code in keyof TCatalog]: Static<TCatalog[Code]["data"]>;
};

export type DomainErrorLike<TCatalog extends DomainErrorCatalog> = {
  [Code in keyof TCatalog]: {
    code: Code;
    message: string;
    details?: DomainErrorDetailsByCode<TCatalog>[Code];
  };
}[keyof TCatalog];

export type OrpcErrorMapFromDomainCatalog<TCatalog extends DomainErrorCatalog> = {
  [Code in keyof TCatalog]: {
    status: TCatalog[Code]["status"];
    message: TCatalog[Code]["message"];
    data: Schema<Static<TCatalog[Code]["data"]>, Static<TCatalog[Code]["data"]>>;
  };
};

export function createOrpcErrorMapFromDomainCatalog<TCatalog extends DomainErrorCatalog>(
  catalog: TCatalog,
): OrpcErrorMapFromDomainCatalog<TCatalog> {
  const mapped = {} as OrpcErrorMapFromDomainCatalog<TCatalog>;

  for (const code of Object.keys(catalog) as Array<keyof TCatalog>) {
    const definition = catalog[code];
    mapped[code] = {
      status: definition.status,
      message: definition.message,
      data: schema(definition.data),
    } as OrpcErrorMapFromDomainCatalog<TCatalog>[typeof code];
  }

  return mapped;
}

type DomainErrorConstructorMap<TCatalog extends DomainErrorCatalog> = {
  [Code in keyof TCatalog]: (input: {
    message: string;
    data: DomainErrorDetailsByCode<TCatalog>[Code];
  }) => unknown;
};

export function throwDomainErrorAsOrpcError<TCatalog extends DomainErrorCatalog>(args: {
  error: unknown;
  isDomainError: (error: unknown) => error is DomainErrorLike<TCatalog>;
  errors: DomainErrorConstructorMap<TCatalog>;
}): never {
  if (!args.isDomainError(args.error)) {
    throw args.error;
  }

  const createOrpcError = args.errors[args.error.code as keyof TCatalog] as (input: {
    message: string;
    data: unknown;
  }) => unknown;

  throw createOrpcError({
    message: args.error.message,
    data: args.error.details ?? {},
  });
}
