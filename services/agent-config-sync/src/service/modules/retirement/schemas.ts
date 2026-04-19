export type RetireAction = {
  agent: "codex" | "claude";
  home: string;
  plugin: string;
  target: string;
  action: "planned" | "deleted" | "updated" | "skipped" | "failed";
  message?: string;
};

export type RetireStaleManagedResult = {
  ok: boolean;
  stalePlugins: Array<{ agent: "codex" | "claude"; home: string; plugin: string }>;
  actions: RetireAction[];
};
