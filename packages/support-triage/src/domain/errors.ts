import { Type, type Static } from "typebox";
import { TriageWorkItemStatusSchema } from "./status";

const optionalString = Type.Optional(
  Type.String({
    minLength: 1,
  }),
);

export const supportTriageDomainErrorCatalog = {
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

export type SupportTriageDomainErrorCode = keyof typeof supportTriageDomainErrorCatalog;

export type SupportTriageDomainErrorDetailsByCode = {
  [Code in SupportTriageDomainErrorCode]: Static<(typeof supportTriageDomainErrorCatalog)[Code]["data"]>;
};

export class SupportTriageDomainError<
  TCode extends SupportTriageDomainErrorCode = SupportTriageDomainErrorCode,
> extends Error {
  readonly code: TCode;
  readonly status: (typeof supportTriageDomainErrorCatalog)[TCode]["status"];
  readonly details?: SupportTriageDomainErrorDetailsByCode[TCode];

  constructor(
    code: TCode,
    message: string | undefined = undefined,
    details?: SupportTriageDomainErrorDetailsByCode[TCode],
  ) {
    const resolvedMessage = message ?? supportTriageDomainErrorCatalog[code].message;
    super(resolvedMessage);
    this.name = "SupportTriageDomainError";
    this.code = code;
    this.status = supportTriageDomainErrorCatalog[code].status;
    this.details = details;
  }
}

export type AnySupportTriageDomainError = {
  [Code in SupportTriageDomainErrorCode]: SupportTriageDomainError<Code>;
}[SupportTriageDomainErrorCode];

export function isSupportTriageDomainError(error: unknown): error is AnySupportTriageDomainError {
  return error instanceof SupportTriageDomainError;
}

export function createSupportTriageDomainError<TCode extends SupportTriageDomainErrorCode>(input: {
  code: TCode;
  details?: SupportTriageDomainErrorDetailsByCode[TCode];
  message?: string;
}): SupportTriageDomainError<TCode> {
  return new SupportTriageDomainError(input.code, input.message, input.details);
}
