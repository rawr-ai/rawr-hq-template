import type {
  DiscoveredSessionFile,
  SessionFileStat,
  SessionSourceFilter,
} from "../schemas";

export type DiscoverSessionsInput = {
  source: SessionSourceFilter;
  limit?: number;
  project?: string;
};

export interface SessionSourceRuntime {
  discoverSessions(input: DiscoverSessionsInput): Promise<DiscoveredSessionFile[]>;
  statFile(input: { path: string }): Promise<SessionFileStat | null>;
  readJsonlObjects(input: { path: string }): AsyncIterable<unknown>;
}
