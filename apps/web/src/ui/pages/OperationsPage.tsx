import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui";

type OperationalSurface = Readonly<{
  label: string;
  description: string;
  href: string;
}>;

function buildOperationalSurfaces(): readonly OperationalSurface[] {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname || "localhost";

  return [
    {
      label: "Operations Console",
      description: "Landing page for HQ runtime launchers and deep links.",
      href: `${protocol}//${hostname}:5173/operations`,
    },
    {
      label: "Coordination Canvas",
      description: "Primary workflow editing and run-state surface.",
      href: `${protocol}//${hostname}:5173/coordination`,
    },
    {
      label: "Inngest Runs",
      description: "Durable workflow execution portal and event trace surface.",
      href: `${protocol}//${hostname}:8288/runs`,
    },
    {
      label: "HyperDX",
      description: "Local traces, metrics, and correlated observability UI.",
      href: `${protocol}//${hostname}:8080/`,
    },
  ] as const;
}

function openLinksInTabs(urls: readonly string[]) {
  for (const url of urls) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export function OperationsPage() {
  const surfaces = buildOperationalSurfaces();
  const graphCommand = "rawr hq graph";

  return (
    <section className="mx-auto max-w-5xl space-y-4">
      <header className="space-y-2">
        <p className="kicker m-0">Operations</p>
        <h1 className="m-0 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Operational Surfaces</h1>
        <p className="m-0 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Open the managed HQ runtime dashboards together, then launch workspace tooling like Nx graph only when you
          actually need it.
        </p>
      </header>

      <div className="flex items-center gap-2">
        <Badge variant="accent">HQ</Badge>
        <p className="m-0 text-xs text-muted-foreground">One place for runtime dashboards, deep links, and workspace tooling.</p>
      </div>

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Operational Tabs</CardTitle>
          <CardDescription>Launch the current HQ runtime surfaces in one browser session.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" onClick={() => openLinksInTabs(surfaces.map((surface) => surface.href))}>
              Open Operational Tabs
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Nx Graph</CardTitle>
          <CardDescription>Workspace exploration stays on-demand instead of being folded into HQ runtime health.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-foreground/90">
            <p className="m-0">
              Launch Nx graph from the terminal with <code>{graphCommand}</code>. That keeps workspace exploration separate from the
              managed app/web/async/observability runtime.
            </p>
            <a
              href="http://127.0.0.1:4211/projects"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-sm border border-border/70 px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary/35 hover:bg-muted/40"
            >
              Open Nx Graph If Already Running
            </a>
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Deep Links</CardTitle>
          <CardDescription>Direct links for each managed operational surface.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {surfaces.map((surface) => (
              <a
                key={surface.href}
                href={surface.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-sm border border-border/70 bg-card/70 px-4 py-3 transition hover:border-primary/35 hover:bg-muted/40"
              >
                <div className="text-sm font-semibold text-foreground">{surface.label}</div>
                <p className="m-0 mt-1 text-sm text-muted-foreground">{surface.description}</p>
                <code className="mt-2 block text-xs text-muted-foreground">{surface.href}</code>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
