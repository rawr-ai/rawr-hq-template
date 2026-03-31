import { AppShell } from "./layout/AppShell";
import { SidebarNav } from "./layout/SidebarNav";
import { Router } from "./routing/router";
import { HomePage } from "./pages/HomePage";
import { MountsPage } from "./pages/MountsPage";
import { NotFoundPage } from "./pages/NotFoundPage";

function HostRoutes() {
  return (
    <Router
      routes={[
        { path: "/", element: <HomePage /> },
        { path: "/mounts", element: <MountsPage /> },
      ]}
      fallback={<NotFoundPage />}
    />
  );
}

export function App() {
  return (
    <AppShell
      sidebar={
        <SidebarNav
          title="RAWR HQ-Template"
          items={[
            { label: "Home", to: "/" },
            { label: "Mounts", to: "/mounts" },
          ]}
          utilityLinks={[
            { label: "Inngest Runs", href: "http://localhost:8288/runs" },
            { label: "HyperDX", href: "http://localhost:8080/" },
            { label: "Nx Graph", href: "http://127.0.0.1:4211/projects" },
          ]}
        />
      }
    >
      <HostRoutes />
    </AppShell>
  );
}
