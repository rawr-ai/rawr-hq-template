import { Link } from "../routing/router";

export function NotFoundPage() {
  return (
    <section style={{ maxWidth: 920 }}>
      <h1 style={{ margin: 0, fontSize: 24 }}>Not found</h1>
      <p style={{ marginTop: 10, opacity: 0.86, lineHeight: 1.5 }}>
        This route doesn’t exist yet.
      </p>
      <Link to="/" style={{ color: "#e8e8ef" }}>
        Go home
      </Link>
    </section>
  );
}

