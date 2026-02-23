import type { TriageWorkItemStatus } from "./domain";

export type SupportTriageDomainErrorDetailsByCode = {
  INVALID_QUEUE_ID: {
    queueId?: string;
  };
  INVALID_REQUESTED_BY: {
    requestedBy?: string;
  };
  INVALID_WORK_ITEM_ID: {
    workItemId?: string;
  };
  WORK_ITEM_NOT_FOUND: {
    workItemId?: string;
  };
  INVALID_STATUS_TRANSITION: {
    workItemId?: string;
    from?: TriageWorkItemStatus;
    to?: TriageWorkItemStatus;
  };
  INVALID_COMPLETION_INPUT: {
    workItemId?: string;
  };
};

export type SupportTriageDomainErrorCode = keyof SupportTriageDomainErrorDetailsByCode;

export class SupportTriageDomainError<
  TCode extends SupportTriageDomainErrorCode = SupportTriageDomainErrorCode,
> extends Error {
  readonly code: TCode;
  readonly details?: SupportTriageDomainErrorDetailsByCode[TCode];

  constructor(code: TCode, message: string, details?: SupportTriageDomainErrorDetailsByCode[TCode]) {
    super(message);
    this.name = "SupportTriageDomainError";
    this.code = code;
    this.details = details;
  }
}

export type AnySupportTriageDomainError = {
  [Code in SupportTriageDomainErrorCode]: SupportTriageDomainError<Code>;
}[SupportTriageDomainErrorCode];

export function isSupportTriageDomainError(error: unknown): error is AnySupportTriageDomainError {
  return error instanceof SupportTriageDomainError;
}
