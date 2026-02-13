import { Link, usePathname } from "../../../routing/router";
import { cn } from "../../../lib/cn";

export type CoordinationNavItem = Readonly<{
  label: string;
  to: string;
}>;

export function NavItem({ item }: { item: CoordinationNavItem }) {
  const pathname = usePathname();
  const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`);

  return (
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
  );
}
