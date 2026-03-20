import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from "../components/ui";
import { publicEnv } from "../config/publicEnv";
import { ExternalLinkIcon } from "../components/icons";

type DeepLink = Readonly<{
  label: string;
  description: string;
  href: string;
  note?: string;
}>;

function buildDeepLinks(): readonly DeepLink[] {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname || "localhost";

  return [
    {
      label: "Inngest Runs",
      description: "Workflow runs and event traces",
      href: `${protocol}//${hostname}:8288/runs`,
    },
    {
      label: "HyperDX",
      description: "Traces, metrics, and runtime observability",
      href: `${protocol}//${hostname}:8080/`,
    },
    {
      label: "Nx Graph",
      description: "Workspace graph explorer",
      href: "http://127.0.0.1:4211/projects",
      note: "Launch with rawr hq graph",
    },
  ] as const;
}

function openLinksInTabs(urls: readonly string[]) {
  for (const url of urls) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export function HomePage() {
  const deepLinks = buildDeepLinks();

  return (
    <section className="mx-auto max-w-5xl space-y-4">
      <header className="space-y-2">
        <p className="kicker m-0">Overview</p>
        <h1 className="m-0 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">RAWR HQ-Template</h1>
        <p className="m-0 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Modern host shell with client-side routing, typed micro-frontend mounts, and a canvas-first coordination
          runtime.
        </p>
      </header>

      <div className="flex items-center gap-2">
        <Badge variant="accent">Runtime</Badge>
        <p className="m-0 text-xs text-muted-foreground">
          Mode: <code>{publicEnv.mode}</code>
        </p>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>Deep Links</CardTitle>
              <CardDescription>External runtime surfaces and local tooling endpoints.</CardDescription>
            </div>
            <Button variant="secondary" size="sm" onClick={() => openLinksInTabs(deepLinks.map((item) => item.href))}>
              Open all
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {deepLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-start justify-between gap-3 rounded-sm border border-border/70 bg-card/70 px-4 py-3 transition hover:border-primary/35 hover:bg-muted/40"
              >
                <div className="min-w-0 space-y-1">
                  <div className="text-sm font-semibold text-foreground">{item.label}</div>
                  <p className="m-0 text-sm text-muted-foreground">{item.description}</p>
                  <code className="block text-xs text-muted-foreground">{item.href}</code>
                  {item.note ? <div className="text-xs text-muted-foreground">{item.note}</div> : null}
                </div>
                <ExternalLinkIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
          <CardDescription>Recommended follow-up integration tasks for a productionized host shell.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="m-0 list-disc space-y-2 pl-5 text-sm text-foreground/90">
          <li>Wire real micro-frontends behind a mount registry.</li>
          <li>Add auth + bootstrapped user context to mount ctx.</li>
          <li>Expand component coverage for richer host-level settings and diagnostics.</li>
        </ul>
        </CardContent>
      </Card>
    </section>
  );
}
