import { AppShell } from "./layout/AppShell";
import { SidebarNav } from "./layout/SidebarNav";
import { Router } from "./routing/router";
import { HomePage } from "./pages/HomePage";
import { MountsPage } from "./pages/MountsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { OperationsPage } from "./pages/OperationsPage";
import { CoordinationPage } from "./coordination/components/CoordinationPage";

function HostRoutes() {
  return (
    <Router
      routes={[
        { path: "/", element: <HomePage /> },
        { path: "/operations", element: <OperationsPage /> },
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
            { label: "Operations", to: "/operations" },
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
