import type { TriageWorkItemStore } from "./store";

export type SupportExampleServiceDeps = {
  store: TriageWorkItemStore;
  now: () => string;
  generateWorkItemId: () => string;
};

export type SupportExampleServiceContext = {
  deps: SupportExampleServiceDeps;
};
