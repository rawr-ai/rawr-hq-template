import type { CoordinationNavItem } from "./NavItem";
import { NavItem } from "./NavItem";

export function Sidebar({
  items,
}: {
  items: readonly CoordinationNavItem[];
}) {
  return (
    <nav aria-label="Primary" className="grid list-none gap-2 p-0">
      {items.map((item) => (
        <NavItem key={item.to} item={item} />
      ))}
    </nav>
  );
}
