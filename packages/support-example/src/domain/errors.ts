import { Type, type Static } from "typebox";
import { TriageWorkItemStatusSchema } from "./status";

const optionalString = Type.Optional(
  Type.String({
    minLength: 1,
  }),
);

export const supportExampleDomainErrorCatalog = {
  INVALID_QUEUE_ID: {
    status: 400,
    message: "Invalid queueId",
    data: Type.Object(
      {
        queueId: optionalString,
      },
      { additionalProperties: false },
    ),
  },
  INVALID_REQUESTED_BY: {
    status: 400,
    message: "Invalid requestedBy",
    data: Type.Object(
      {
        requestedBy: optionalString,
      },
      { additionalProperties: false },
    ),
  },
  INVALID_WORK_ITEM_ID: {
    status: 400,
    message: "Invalid workItemId",
    data: Type.Object(
      {
        workItemId: optionalString,
      },
      { additionalProperties: false },
    ),
  },
  INVALID_COMPLETION_INPUT: {
    status: 400,
    message: "Invalid completion input",
    data: Type.Object(
      {
        workItemId: optionalString,
      },
      { additionalProperties: false },
    ),
  },
  WORK_ITEM_NOT_FOUND: {
    status: 404,
    message: "Work item not found",
    data: Type.Object(
      {
        workItemId: optionalString,
      },
      { additionalProperties: false },
    ),
  },
  INVALID_STATUS_TRANSITION: {
    status: 409,
    message: "Invalid status transition",
    data: Type.Object(
      {
        workItemId: optionalString,
        from: Type.Optional(TriageWorkItemStatusSchema),
        to: Type.Optional(TriageWorkItemStatusSchema),
      },
      { additionalProperties: false },
    ),
  },
} as const;

export type SupportExampleDomainErrorCode = keyof typeof supportExampleDomainErrorCatalog;

export type SupportExampleDomainErrorDetailsByCode = {
  [Code in SupportExampleDomainErrorCode]: Static<(typeof supportExampleDomainErrorCatalog)[Code]["data"]>;
};

export class SupportExampleDomainError<
  TCode extends SupportExampleDomainErrorCode = SupportExampleDomainErrorCode,
> extends Error {
  readonly code: TCode;
  readonly status: (typeof supportExampleDomainErrorCatalog)[TCode]["status"];
  readonly details?: SupportExampleDomainErrorDetailsByCode[TCode];

  constructor(
    code: TCode,
    message: string | undefined = undefined,
    details?: SupportExampleDomainErrorDetailsByCode[TCode],
  ) {
    const resolvedMessage = message ?? supportExampleDomainErrorCatalog[code].message;
    super(resolvedMessage);
    this.name = "SupportExampleDomainError";
    this.code = code;
    this.status = supportExampleDomainErrorCatalog[code].status;
    this.details = details;
  }
}

export type AnySupportExampleDomainError = {
  [Code in SupportExampleDomainErrorCode]: SupportExampleDomainError<Code>;
}[SupportExampleDomainErrorCode];

export function isSupportExampleDomainError(error: unknown): error is AnySupportExampleDomainError {
  return error instanceof SupportExampleDomainError;
}

export function createSupportExampleDomainError<TCode extends SupportExampleDomainErrorCode>(input: {
  code: TCode;
  details?: SupportExampleDomainErrorDetailsByCode[TCode];
  message?: string;
}): SupportExampleDomainError<TCode> {
  return new SupportExampleDomainError(input.code, input.message, input.details);
}
