import { AppShell } from "./layout/AppShell";
import { SidebarNav } from "./layout/SidebarNav";
import { Router } from "./routing/router";
import { HomePage } from "./pages/HomePage";
import { MountsPage } from "./pages/MountsPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export function App() {
  return (
    <AppShell
      sidebar={
        <SidebarNav
          title="RAWR HQ"
          items={[
            { label: "Home", to: "/" },
            { label: "Mounts", to: "/mounts" },
          ]}
        />
      }
    >
      <Router
        routes={[
          { path: "/", element: <HomePage /> },
          { path: "/mounts", element: <MountsPage /> },
        ]}
        fallback={<NotFoundPage />}
      />
    </AppShell>
  );
}
