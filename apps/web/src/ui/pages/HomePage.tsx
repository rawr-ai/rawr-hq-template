import { publicEnv } from "../config/publicEnv";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from "../components/ui";

export function HomePage() {
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
