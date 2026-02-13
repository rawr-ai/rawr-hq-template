import { AppShell } from "./layout/AppShell";
import { SidebarNav } from "./layout/SidebarNav";
import { Router } from "./routing/router";
import { HomePage } from "./pages/HomePage";
import { MountsPage } from "./pages/MountsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { CoordinationPage } from "./coordination/components/CoordinationPage";

function HostRoutes() {
  return (
    <Router
      routes={[
        { path: "/", element: <HomePage /> },
        { path: "/mounts", element: <MountsPage /> },
        { path: "/coordination", element: <CoordinationPage /> },
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
            { label: "Coordination", to: "/coordination" },
          ]}
        />
      }
    >
      <HostRoutes />
    </AppShell>
  );
}
