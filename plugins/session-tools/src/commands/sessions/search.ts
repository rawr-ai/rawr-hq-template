import { Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import {
  clearIndexFile,
  defaultIndexPath,
  listSessions,
  reindexSessions,
  searchSessionsByContent,
  searchSessionsByMetadata,
  type MetadataSearchHit,
  type SearchHit,
  type RoleFilter,
  type SessionSourceFilter,
} from "@rawr/session-tools";
import { ensureDir, writeJsonFile } from "../../lib/out-dir";

export default class SessionsSearch extends RawrCommand {
  static description = "Search sessions by metadata or transcript content";
  private static readonly DEFAULT_SAFE_LIMIT = 5;

  static flags = {
    ...RawrCommand.baseFlags,
    source: Flags.string({
      description: "Session source",
      options: ["claude", "codex", "all"],
      default: "all",
    }),
    limit: Flags.integer({ description: "Max results to return", default: SessionsSearch.DEFAULT_SAFE_LIMIT, min: 1, max: 50_000 }),
    "query-metadata": Flags.string({ description: "Metadata substring query (no transcript reads)" }),
    query: Flags.string({ description: "Regex content query (reads transcripts; optionally uses index)" }),
    "ignore-case": Flags.boolean({ description: "Case-insensitive regex search", default: false }),
    "max-matches": Flags.integer({
      description: "Max sessions to return for content search",
      default: SessionsSearch.DEFAULT_SAFE_LIMIT,
      min: 1,
      max: 50_000,
    }),
    snippet: Flags.integer({ description: "Snippet length for content search", default: 300, min: 50, max: 5_000 }),
    "use-index": Flags.boolean({ description: "Use sqlite cache for transcript text", default: false }),
    "index-path": Flags.string({ description: "Sqlite index file path", default: defaultIndexPath() }),
    reindex: Flags.boolean({ description: "Rebuild sqlite cache for matching sessions (runs before search)", default: false }),
    "reindex-limit": Flags.integer({
      description: "Limit sessions to reindex (0 = all matches)",
      default: SessionsSearch.DEFAULT_SAFE_LIMIT,
      min: 0,
      max: 50_000,
    }),
    roles: Flags.string({
      description: "Roles to include for content search (repeatable): user | assistant | tool | all",
      options: ["user", "assistant", "tool", "all"],
      multiple: true,
      default: ["user", "assistant"],
    }),
    "include-tools": Flags.boolean({ description: "Include tool / non-dialog events in content search", default: false }),
    project: Flags.string({ description: "Filter Claude sessions by project (path or name substring)" }),
    "cwd-contains": Flags.string({ description: "Filter by cwd substring" }),
    branch: Flags.string({ description: "Filter by git branch substring" }),
    model: Flags.string({ description: "Filter by model substring" }),
    since: Flags.string({ description: "Filter by modified time >= since (ISO or YYYY-MM-DD)" }),
    until: Flags.string({ description: "Filter by modified time <= until (ISO or YYYY-MM-DD)" }),
    "out-dir": Flags.string({ description: "Write results to a directory (search-results.json)" }),
    quiet: Flags.boolean({ description: "Suppress human output", default: false }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(SessionsSearch);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const source = String(flags.source) as SessionSourceFilter;

    const metadataQuery = flags["query-metadata"] ? String(flags["query-metadata"]) : null;
    const contentQuery = flags.query ? String(flags.query) : null;
    const outDir = flags["out-dir"] ? String(flags["out-dir"]) : null;
    const limit = Number(flags.limit);
    const maxMatches = Number(flags["max-matches"]);
    const reindexLimit = Number(flags["reindex-limit"]);

    if (metadataQuery && flags.reindex) {
      const result = this.fail("--reindex is only supported for content search (use --query)", { code: "REINDEX_WITH_METADATA_QUERY" });
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    if (metadataQuery && contentQuery) {
      const result = this.fail("Use only one of --query-metadata or --query", { code: "AMBIGUOUS_QUERY" });
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }
    if (!metadataQuery && !contentQuery && !flags.reindex) {
      const result = this.fail("Provide either --query-metadata, --query, or --reindex", { code: "MISSING_QUERY" });
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const sessionFetchLimit = (() => {
      if (metadataQuery) return limit;
      if (flags.reindex && reindexLimit === 0) return 0; // explicit opt-in for unbounded reindex
      if (contentQuery) return Math.max(maxMatches, reindexLimit);
      if (flags.reindex) return reindexLimit;
      return limit;
    })();

    const sessions = await listSessions({
      source,
      limit: sessionFetchLimit,
      filters: {
        project: flags.project ? String(flags.project) : undefined,
        cwdContains: flags["cwd-contains"] ? String(flags["cwd-contains"]) : undefined,
        branch: flags.branch ? String(flags.branch) : undefined,
        model: flags.model ? String(flags.model) : undefined,
        since: flags.since ? String(flags.since) : undefined,
        until: flags.until ? String(flags.until) : undefined,
      },
    });

    let hits: Array<SearchHit | MetadataSearchHit> = [];
    if (metadataQuery) {
      hits = searchSessionsByMetadata(sessions, metadataQuery, limit);
    } else {
      const indexPath = String(flags["index-path"] ?? defaultIndexPath());
      const roles = (flags.roles as unknown as string[]).map(String) as RoleFilter[];
      const includeTools = Boolean(flags["include-tools"]);

      if (flags.reindex) {
        await clearIndexFile(indexPath);
        const reindexResult = await reindexSessions({
          sessions,
          roles,
          includeTools,
          indexPath,
          limit: reindexLimit,
        });
        if (!contentQuery) {
          if (outDir) {
            await ensureDir(outDir);
            await writeJsonFile(outDir, "search-results.json", { mode: "reindex", reindex: reindexResult });
          }

          const result = this.ok({ query: null, hits: [], outDir, reindex: reindexResult });
          this.outputResult(result, {
            flags: baseFlags,
            human: () => {
              if (flags.quiet) return;
              this.log(`reindexed ${reindexResult.indexed}/${reindexResult.total}`);
            },
          });
          return;
        }
      }

      hits = await searchSessionsByContent({
        sessions,
        pattern: contentQuery!,
        ignoreCase: Boolean(flags["ignore-case"]),
        maxMatches,
        snippetLen: Number(flags.snippet),
        roles,
        includeTools,
        useIndex: Boolean(flags["use-index"] || flags.reindex),
        indexPath,
      });
    }

    if (outDir) {
      await ensureDir(outDir);
      await writeJsonFile(outDir, "search-results.json", {
        mode: metadataQuery ? "query-metadata" : "query",
        query: metadataQuery ?? contentQuery,
        hits,
      });
    }

    const result = this.ok({ query: metadataQuery ?? contentQuery, hits, outDir });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        if (flags.quiet) return;
        if (metadataQuery) {
          for (const h of hits as MetadataSearchHit[]) {
            const id = h.sessionId ? h.sessionId.slice(0, 10) : "?";
            const title = (h.title ?? "").replaceAll(/\s+/g, " ").slice(0, 120);
            this.log(`${h.matchScore}  ${h.source} ${id}  ${title}  (${h.path})`);
          }
          return;
        }

        for (const h of hits as SearchHit[]) {
          const id = h.sessionId ? h.sessionId.slice(0, 10) : "?";
          const title = (h.title ?? "").replaceAll(/\s+/g, " ").slice(0, 80);
          this.log(`${h.matchCount}  ${h.source} ${id}  ${title}  ${h.matchSnippet}  (${h.path})`);
        }
      },
    });
  }
}
