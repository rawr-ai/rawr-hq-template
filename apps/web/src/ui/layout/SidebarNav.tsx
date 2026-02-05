import { Link, usePathname } from "../routing/router";

type NavItem = Readonly<{
  label: string;
  to: string;
}>;

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`);

  return (
    <li>
      <Link
        to={item.to}
        aria-current={isActive ? "page" : undefined}
        style={{
          display: "block",
          padding: "10px 12px",
          borderRadius: 10,
          color: isActive ? "#0b0b0f" : "#e8e8ef",
          background: isActive ? "#e8e8ef" : "transparent",
          textDecoration: "none",
        }}
      >
        {item.label}
      </Link>
    </li>
  );
}

export function SidebarNav({
  title,
  items,
}: {
  title: string;
  items: readonly NavItem[];
}) {
  return (
    <nav aria-label="Primary">
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, opacity: 0.7, letterSpacing: "0.08em" }}>
          HOST SHELL
        </div>
        <div style={{ fontSize: 18, fontWeight: 650 }}>{title}</div>
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
        {items.map((item) => (
          <NavLink key={item.to} item={item} />
        ))}
      </ul>
    </nav>
  );
}

