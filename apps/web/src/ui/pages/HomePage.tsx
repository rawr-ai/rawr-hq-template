import { publicEnv } from "../config/publicEnv";

export function HomePage() {
  return (
    <section style={{ maxWidth: 920 }}>
      <h1 style={{ margin: 0, fontSize: 28 }}>RAWR HQ-Template</h1>
      <p style={{ marginTop: 10, opacity: 0.86, lineHeight: 1.5 }}>
        Minimal host shell: client-side routing, sidebar navigation, and a typed
        micro-frontend mount contract.
      </p>
      <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
        Mode: <code>{publicEnv.mode}</code>
      </div>
      <div
        style={{
          marginTop: 18,
          padding: 16,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.04)",
        }}
      >
        <div style={{ fontWeight: 650 }}>Next</div>
        <ul style={{ margin: "10px 0 0 18px", opacity: 0.9, lineHeight: 1.6 }}>
          <li>Wire real micro-frontends behind a mount registry.</li>
          <li>Add auth + bootstrapped user context to mount ctx.</li>
          <li>Optional: move styling into a tiny CSS file.</li>
        </ul>
      </div>
    </section>
  );
}
