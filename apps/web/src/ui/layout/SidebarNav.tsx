import { Link, usePathname } from "../routing/router";
import { cn } from "../lib/cn";

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
        className={cn(
          "block rounded-sm border px-3 py-2 text-sm font-medium transition",
          isActive
            ? "border-primary/40 bg-primary/15 text-primary"
            : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground",
        )}
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
    <nav aria-label="Primary" className="grid gap-4">
      <div className="grid gap-2 border-b border-border/70 pb-4">
        <p className="kicker m-0">Host Shell</p>
        <p className="m-0 text-lg font-semibold tracking-tight text-foreground">{title}</p>
      </div>
      <ul className="grid list-none gap-2 p-0">{items.map((item) => <NavLink key={item.to} item={item} />)}</ul>
    </nav>
  );
}
