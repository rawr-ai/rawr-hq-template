import type { MicroFrontendModule, MountContext, MountHandle } from "@rawr/ui-sdk";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Separator } from "../components/ui";
import { hqClient } from "../lib/orpc-client";

type MountStatus =
  | { status: "loading" }
  | { status: "mounted" }
  | { status: "error"; error: string };

const pluginPrefix = "@rawr/plugin-";

function pluginIdToDirName(id: string): string {
  if (id.startsWith(pluginPrefix)) return id.slice(pluginPrefix.length);
  return id;
}

async function importMicroFrontend(url: string): Promise<MicroFrontendModule> {
  const mod = (await import(/* @vite-ignore */ url)) as any;
  if (typeof mod?.mount === "function") return { mount: mod.mount };
  if (typeof mod?.default?.mount === "function") return { mount: mod.default.mount };
  throw new Error("Module does not export mount(el, ctx)");
}

export function MountsPage() {
  const [enabled, setEnabled] = useState<string[] | null>(null);
  const [statuses, setStatuses] = useState<Record<string, MountStatus>>({});
  const unmountsRef = useRef<Map<string, () => void>>(new Map());
  const containersRef = useRef<Map<string, HTMLDivElement>>(new Map());

  const ctx = useMemo<MountContext>(
    () => ({
      hostAppId: "rawr-hq-template",
      basePath: "/",
      getLocation: () => ({
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
      }),
      navigate: (to) => {
        window.history.pushState({}, "", to);
        window.dispatchEvent(new PopStateEvent("popstate"));
      },
    }),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const response = await hqClient.state.getRuntimeState({});
      if (cancelled) return;
      const plugins = response.state?.plugins;
      setEnabled(Array.isArray(plugins?.enabled) ? plugins.enabled : []);
    })().catch((err) => {
      if (cancelled) return;
      setEnabled([]);
      setStatuses({ _error: { status: "error", error: String(err) } });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Unmount anything no longer enabled.
    for (const [id, unmount] of unmountsRef.current.entries()) {
      if (!enabled.includes(id)) {
        try {
          unmount();
        } catch {
          // ignore
        }
        unmountsRef.current.delete(id);
        containersRef.current.delete(id);
      }
    }

    for (const id of enabled) {
      if (unmountsRef.current.has(id)) continue;
      setStatuses((prev) => ({ ...prev, [id]: { status: "loading" } }));
      const dirName = pluginIdToDirName(id);
      const url = `/rawr/plugins/web/${dirName}`;

      (async () => {
        const module = await importMicroFrontend(url);
        const container = document.createElement("div");
        containersRef.current.set(id, container);

        const handle = (await module.mount(container, ctx)) as void | MountHandle;
        unmountsRef.current.set(id, () => handle?.unmount?.());
        setStatuses((prev) => ({ ...prev, [id]: { status: "mounted" } }));
      })().catch((err) => {
        setStatuses((prev) => ({ ...prev, [id]: { status: "error", error: String(err) } }));
      });
    }

    return () => {
      for (const unmount of unmountsRef.current.values()) {
        try {
          unmount();
        } catch {
          // ignore
        }
      }
      unmountsRef.current.clear();
      containersRef.current.clear();
    };
  }, [enabled, ctx]);

  return (
    <section className="mx-auto max-w-5xl space-y-4">
      <header className="space-y-2">
        <p className="kicker m-0">Micro-Frontend Host</p>
        <h1 className="m-0 text-3xl font-semibold tracking-tight text-foreground">Mount Contract</h1>
        <p className="m-0 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
          The host expects micro-frontends to export <code>mount(el, ctx)</code>. Contract typing is provided by{" "}
          <code>@rawr/ui-sdk</code>.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Enabled Micro-Frontends
            <Badge variant="accent">{enabled?.length ?? 0}</Badge>
          </CardTitle>
          <CardDescription>
            Loads plugin ids from <code>state.getRuntimeState</code> via ORPC, then mounts from{" "}
            <code>/rawr/plugins/web/&lt;dirName&gt;</code> via dynamic <code>import()</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {enabled === null ? (
            <p className="m-0 text-sm text-muted-foreground">Loading plugin state…</p>
          ) : enabled.length === 0 ? (
            <p className="m-0 rounded-sm border border-border/70 bg-muted/55 p-3 text-sm text-muted-foreground">
              No enabled plugins. Try <code>rawr plugins web enable mfe-demo --risk off</code>.
            </p>
          ) : (
            <ul className="m-0 list-none space-y-4 p-0">
              {enabled.map((id) => {
                const s = statuses[id];
                const statusLabel =
                  s?.status === "mounted" ? "mounted" : s?.status === "error" ? `error: ${s.error}` : "loading";
                const badgeVariant =
                  s?.status === "mounted" ? "success" : s?.status === "error" ? "destructive" : "warning";

                return (
                  <li key={id} className="rounded-md border border-border/75 bg-card/70 p-3 shadow-panel">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded-sm bg-muted px-1.5 py-0.5 text-[0.8rem]">{id}</code>
                      <Badge variant={badgeVariant}>{statusLabel}</Badge>
                    </div>
                    <Separator className="my-3" />
                    <div
                      ref={(el) => {
                        const container = containersRef.current.get(id);
                        if (!el || !container) return;
                        el.replaceChildren(container);
                      }}
                    />
                  </li>
                );
              })}
            </ul>
          )}

          {statuses._error?.status === "error" ? (
            <p className="m-0 rounded-sm border border-destructive/40 bg-destructive/12 p-3 text-sm text-destructive">
              {statuses._error.error}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
