import { Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import type { Client } from "@rawr/session-intelligence/client";
import { ensureDir, writeJsonFile } from "../../lib/out-dir";
import {
  createSessionIntelligenceClient,
  defaultSessionIndexPathSync,
} from "../../lib/session-intelligence-client";
import type {
  FacetSearchHit,
  MetadataSearchHit,
  RoleFilter,
  SearchHit,
  SessionFacetFilters,
  SessionSourceFilter,
} from "../../lib/session-types";

type SearchMetadataOptions = NonNullable<Parameters<Client["search"]["metadata"]>[1]>;
type SearchContentOptions = NonNullable<Parameters<Client["search"]["content"]>[1]>;
type SearchFacetsOptions = NonNullable<Parameters<Client["search"]["facets"]>[1]>;
type SearchClearIndexOptions = NonNullable<Parameters<Client["search"]["clearIndex"]>[1]>;
type SearchReindexOptions = NonNullable<Parameters<Client["search"]["reindex"]>[1]>;

function normalizeFacetToken(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
}

function facetFlagValues(value: unknown): string[] | undefined {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  const normalized = [...new Set(values.map((item) => normalizeFacetToken(String(item))).filter(Boolean))].sort();
  return normalized.length ? normalized : undefined;
}

function hasFacetFilters(filters: SessionFacetFilters): boolean {
  return Boolean(
    filters.tags?.length ||
      filters.directives?.length ||
      filters.tools?.length ||
      filters.payloadTypes?.length ||
      filters.topTypes?.length,
  );
}

export default class SessionsSearch extends RawrCommand {
  static description = "Search sessions by metadata or transcript content";
  private static readonly DEFAULT_SAFE_LIMIT = 5;
  private static readonly DEFAULT_FACET_CANDIDATE_LIMIT = 250;

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
    "index-path": Flags.string({ description: "Sqlite index file path", default: defaultSessionIndexPathSync() }),
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
    "has-tag": Flags.string({ description: "Require XML-ish block tag facet (repeatable)", multiple: true }),
    "has-directive": Flags.string({ description: "Require directive facet such as code-comment (repeatable)", multiple: true }),
    "has-tool": Flags.string({ description: "Require tool call facet such as apply_patch (repeatable)", multiple: true }),
    "has-payload-type": Flags.string({ description: "Require Codex payload.type facet (repeatable)", multiple: true }),
    "has-top-type": Flags.string({ description: "Require top-level JSONL type facet (repeatable)", multiple: true }),
    "candidate-limit": Flags.integer({
      description: "Max sessions to scan for structured facets",
      default: SessionsSearch.DEFAULT_FACET_CANDIDATE_LIMIT,
      min: 1,
      max: 50_000,
    }),
    "print-facets": Flags.boolean({ description: "Include computed facets in --out-dir JSON", default: false }),
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
    const candidateLimit = Number(flags["candidate-limit"]);
    const filters = {
      project: flags.project ? String(flags.project) : undefined,
      cwdContains: flags["cwd-contains"] ? String(flags["cwd-contains"]) : undefined,
      branch: flags.branch ? String(flags.branch) : undefined,
      model: flags.model ? String(flags.model) : undefined,
      since: flags.since ? String(flags.since) : undefined,
      until: flags.until ? String(flags.until) : undefined,
    };
    const facetFilters: SessionFacetFilters = {};
    const tags = facetFlagValues(flags["has-tag"]);
    const directives = facetFlagValues(flags["has-directive"]);
    const tools = facetFlagValues(flags["has-tool"]);
    const payloadTypes = facetFlagValues(flags["has-payload-type"]);
    const topTypes = facetFlagValues(flags["has-top-type"]);
    if (tags) facetFilters.tags = tags;
    if (directives) facetFilters.directives = directives;
    if (tools) facetFilters.tools = tools;
    if (payloadTypes) facetFilters.payloadTypes = payloadTypes;
    if (topTypes) facetFilters.topTypes = topTypes;
    const hasFacets = hasFacetFilters(facetFilters);
    const includeFacets = Boolean(flags["print-facets"]);

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
    if (hasFacets && flags.reindex && !contentQuery) {
      const result = this.fail("--reindex with structured facet filters requires --query", { code: "REINDEX_WITH_FACET_FILTERS" });
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    if (!metadataQuery && !contentQuery && !flags.reindex && !hasFacets) {
      const result = this.fail("Provide either --query-metadata, --query, --reindex, or at least one --has-* facet filter", { code: "MISSING_QUERY" });
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const sessionFetchLimit = (() => {
      if (metadataQuery) return limit;
      if (flags.reindex && reindexLimit === 0) return 0; // explicit opt-in for unbounded reindex
      if (contentQuery && hasFacets) return limit;
      if (contentQuery) return Math.max(maxMatches, reindexLimit);
      if (flags.reindex) return reindexLimit;
      return limit;
    })();

    const indexPath = contentQuery || flags.reindex ? String(flags["index-path"]) : undefined;
    const client = await createSessionIntelligenceClient(indexPath ? { indexPath } : {});

    let hits: Array<SearchHit | MetadataSearchHit | FacetSearchHit> = [];
    let mode: "query-metadata" | "query" | "facets" = metadataQuery ? "query-metadata" : contentQuery ? "query" : "facets";
    if (metadataQuery) {
      const metadataOptions = {
        context: { invocation: { traceId: "plugin-session-tools.search.metadata" } },
      } satisfies SearchMetadataOptions;
      const response = await client.search.metadata(
        {
          source,
          filters,
          needle: metadataQuery,
          limit,
          ...(hasFacets ? { facetFilters, candidateLimit } : {}),
          ...(includeFacets ? { includeFacets: true } : {}),
        },
        metadataOptions,
      );
      hits = response.hits;
    } else if (contentQuery || flags.reindex) {
      const roles = (flags.roles as unknown as string[]).map(String) as RoleFilter[];
      const includeTools = Boolean(flags["include-tools"]);

      if (flags.reindex) {
        const clearIndexOptions = {
          context: { invocation: { traceId: "plugin-session-tools.search.clear-index" } },
        } satisfies SearchClearIndexOptions;
        await client.search.clearIndex({}, clearIndexOptions);
        const reindexOptions = {
          context: { invocation: { traceId: "plugin-session-tools.search.reindex" } },
        } satisfies SearchReindexOptions;
        const reindexResult = await client.search.reindex(
          {
            source,
            filters,
            roles,
            includeTools,
            limit: reindexLimit,
          },
          reindexOptions,
        );
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

      const contentOptions = {
        context: { invocation: { traceId: "plugin-session-tools.search.content" } },
      } satisfies SearchContentOptions;
      const response = await client.search.content(
        {
          pattern: contentQuery!,
          ignoreCase: Boolean(flags["ignore-case"]),
          maxMatches,
          snippetLen: Number(flags.snippet),
          roles,
          includeTools,
          useIndex: Boolean(flags["use-index"] || flags.reindex),
          source,
          filters,
          limit: sessionFetchLimit,
          ...(hasFacets ? { facetFilters, candidateLimit } : {}),
          ...(includeFacets ? { includeFacets: true } : {}),
        },
        contentOptions,
      );
      hits = response.hits;
    } else {
      const facetsOptions = {
        context: { invocation: { traceId: "plugin-session-tools.search.facets" } },
      } satisfies SearchFacetsOptions;
      const response = await client.search.facets(
        {
          source,
          filters,
          facetFilters,
          limit,
          candidateLimit,
          ...(includeFacets ? { includeFacets: true } : {}),
        },
        facetsOptions,
      );
      hits = response.hits;
    }

    if (outDir) {
      await ensureDir(outDir);
      await writeJsonFile(outDir, "search-results.json", {
        mode,
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

        if (mode === "facets") {
          for (const h of hits as FacetSearchHit[]) {
            const id = h.sessionId ? h.sessionId.slice(0, 10) : "?";
            const title = (h.title ?? "").replaceAll(/\s+/g, " ").slice(0, 120);
            this.log(`${h.source} ${id}  ${title}  (${h.path})`);
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
