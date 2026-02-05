import type { MicroFrontendModule, MountContext, MountHandle } from "@rawr/ui-sdk";
import React, { useEffect, useMemo, useRef, useState } from "react";

type RawrState = {
  ok: boolean;
  plugins: { enabled: string[] };
};

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
      const res = await fetch("/rawr/state");
      const json = (await res.json()) as RawrState;
      if (cancelled) return;
      setEnabled(Array.isArray(json?.plugins?.enabled) ? json.plugins.enabled : []);
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
    <section style={{ maxWidth: 920 }}>
      <h1 style={{ margin: 0, fontSize: 24 }}>Micro-frontend mount contract</h1>
      <p style={{ marginTop: 10, opacity: 0.86, lineHeight: 1.5 }}>
        The host shell expects micro-frontends to export a <code>mount(el, ctx)</code>{" "}
        function. The contract lives in <code>@rawr/ui-sdk</code>.
      </p>

      <div style={{ marginTop: 16, padding: 16, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)" }}>
        <div style={{ fontWeight: 650 }}>Enabled micro-frontends</div>
        <p style={{ marginTop: 8, opacity: 0.86, lineHeight: 1.5 }}>
          This page fetches <code>/rawr/state</code>, then loads enabled plugins from{" "}
          <code>/rawr/plugins/web/&lt;dirName&gt;</code> using dynamic <code>import()</code>.
        </p>

        {enabled === null ? (
          <div style={{ opacity: 0.8 }}>Loading…</div>
        ) : enabled.length === 0 ? (
          <div style={{ opacity: 0.8 }}>
            No enabled plugins. Try <code>rawr hq plugins enable mfe-demo --risk off</code>.
          </div>
        ) : (
          <ul style={{ margin: "10px 0 0 18px", opacity: 0.95, lineHeight: 1.6 }}>
            {enabled.map((id) => {
              const s = statuses[id];
              const statusLabel =
                s?.status === "mounted" ? "mounted" : s?.status === "error" ? `error: ${s.error}` : "loading";
              return (
                <li key={id}>
                  <code>{id}</code> — <span style={{ opacity: 0.8 }}>{statusLabel}</span>
                  <div style={{ marginTop: 10 }}>
                    <div
                      ref={(el) => {
                        const container = containersRef.current.get(id);
                        if (!el || !container) return;
                        el.replaceChildren(container);
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {statuses._error?.status === "error" ? (
          <div style={{ marginTop: 12, color: "tomato" }}>{statuses._error.error}</div>
        ) : null}
      </div>
    </section>
  );
}
