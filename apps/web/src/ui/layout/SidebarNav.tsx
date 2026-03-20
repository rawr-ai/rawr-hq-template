import { Link, usePathname } from "../routing/router";
import { cn } from "../lib/cn";
import {
  CpuIcon,
  ExternalLinkIcon,
  HomeIcon,
  InboxIcon,
  LayersIcon,
  NetworkIcon,
} from "../components/icons";
import type { SVGProps } from "react";

type NavItem = Readonly<{
  label: string;
  to: string;
}>;

type IconComponent = (props: SVGProps<SVGSVGElement>) => ReturnType<typeof HomeIcon>;

const ICONS: Record<string, IconComponent> = {
  Home: HomeIcon,
  Mounts: LayersIcon,
  Coordination: NetworkIcon,
  "Inngest Runs": InboxIcon,
  HyperDX: CpuIcon,
  "Nx Graph": ExternalLinkIcon,
};

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`);

  return (
    <li>
      <Link
        to={item.to}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex items-center gap-2.5 rounded-sm border px-3 py-2 text-sm font-medium transition",
          isActive
            ? "border-primary/40 bg-primary/15 text-primary"
            : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground",
        )}
      >
        {(() => {
          const Icon = ICONS[item.label];
          return Icon ? <Icon className={cn("h-4 w-4", isActive ? "opacity-100" : "opacity-60")} /> : null;
        })()}
        {item.label}
      </Link>
    </li>
  );
}

type UtilityLink = Readonly<{
  label: string;
  href: string;
}>;

function UtilityNavLink({ item }: { item: UtilityLink }) {
  const Icon = ICONS[item.label] ?? ExternalLinkIcon;

  return (
    <li>
      <a
        href={item.href}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2.5 rounded-sm border border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition hover:border-border hover:bg-muted/60 hover:text-foreground"
      >
        <Icon className="h-4 w-4 opacity-60" />
        {item.label}
      </a>
    </li>
  );
}

export function SidebarNav({
  title,
  items,
  utilityLinks = [],
}: {
  title: string;
  items: readonly NavItem[];
  utilityLinks?: readonly UtilityLink[];
}) {
  return (
    <nav aria-label="Primary" className="grid gap-4">
      <div className="grid gap-2 border-b border-border/70 pb-4">
        <p className="kicker m-0">Host Shell</p>
        <p className="m-0 text-lg font-semibold tracking-tight text-foreground">{title}</p>
      </div>
      <ul className="grid list-none gap-2 p-0">{items.map((item) => <NavLink key={item.to} item={item} />)}</ul>
      {utilityLinks.length > 0 ? (
        <div className="grid gap-2 border-t border-border/70 pt-4">
          <p className="kicker m-0">Utilities</p>
          <ul className="grid list-none gap-2 p-0">
            {utilityLinks.map((item) => <UtilityNavLink key={item.href} item={item} />)}
          </ul>
        </div>
      ) : null}
    </nav>
  );
}
