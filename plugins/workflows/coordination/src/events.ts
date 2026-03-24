import {
  createDeskEvent as createServiceDeskEvent,
  type CreateDeskEventDraft,
} from "@rawr/coordination/events";

function eventId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${rand}`;
}

export type CreateDeskEventInput = CreateDeskEventDraft;

export function createDeskEvent(input: CreateDeskEventInput) {
  return createServiceDeskEvent({
    ...input,
    eventId: eventId("evt"),
    ts: new Date().toISOString(),
  });
}
