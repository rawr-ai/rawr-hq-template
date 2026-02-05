import type { MountContext } from "@rawr/ui-sdk";

const exampleContext: MountContext = {
  hostAppId: "rawr-hq",
  basePath: "/",
  getLocation: () => ({ pathname: "/", search: "", hash: "" }),
  navigate: () => undefined,
};

export function MountsPage() {
  return (
    <section style={{ maxWidth: 920 }}>
      <h1 style={{ margin: 0, fontSize: 24 }}>Micro-frontend mount contract</h1>
      <p style={{ marginTop: 10, opacity: 0.86, lineHeight: 1.5 }}>
        The host shell expects micro-frontends to export a <code>mount(el, ctx)</code>{" "}
        function. The contract lives in <code>@rawr/ui-sdk</code>.
      </p>

      <div
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.04)",
        }}
      >
        <div style={{ fontWeight: 650 }}>Type anchors</div>
        <ul style={{ margin: "10px 0 0 18px", opacity: 0.9, lineHeight: 1.6 }}>
          <li>
            <code>MountFn</code> (signature): <code>mount(el, ctx)</code>
          </li>
          <li>
            <code>MountContext</code> (host APIs): <code>{exampleContext.hostAppId}</code>
          </li>
          <li>
            <code>MountHandle</code> (optional): <code>{"{ unmount?() }"}</code>
          </li>
        </ul>
      </div>
    </section>
  );
}
