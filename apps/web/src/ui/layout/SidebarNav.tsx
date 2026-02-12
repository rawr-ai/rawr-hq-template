import { Link, usePathname } from "../routing/router";
import "../styles/sidebar-nav.css";

type NavItem = Readonly<{
  label: string;
  to: string;
}>;

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`);

  return (
    <li>
      <Link to={item.to} aria-current={isActive ? "page" : undefined} className="sidebar-nav__link">
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
    <nav aria-label="Primary" className="sidebar-nav">
      <div className="sidebar-nav__identity">
        <p className="sidebar-nav__kicker">Host Shell</p>
        <p className="sidebar-nav__title">{title}</p>
      </div>
      <ul className="sidebar-nav__list">
        {items.map((item) => (
          <NavLink key={item.to} item={item} />
        ))}
      </ul>
    </nav>
  );
}
