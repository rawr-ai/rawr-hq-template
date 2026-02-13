import { Link, usePathname } from "../../../routing/router";
import { cn } from "../../../lib/cn";
import {
  HomeIcon,
  LayersIcon,
  NetworkIcon,
} from "../../../components/icons";
import type { SVGProps } from "react";

export type CoordinationNavItem = Readonly<{
  label: string;
  to: string;
  icon: string;
}>;

type IconComponent = (props: SVGProps<SVGSVGElement>) => ReturnType<typeof HomeIcon>;

const ICON_MAP: Record<string, IconComponent> = {
  home: HomeIcon,
  layers: LayersIcon,
  network: NetworkIcon,
};

export function NavItem({ item }: { item: CoordinationNavItem }) {
  const pathname = usePathname();
  const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`);

  return (
    <Link
      to={item.to}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-[7px] text-[13px] font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        isActive
          ? "text-accent bg-accent-bg"
          : "text-text-secondary hover:bg-raised hover:text-text-primary",
      )}
    >
      {(() => {
        const Icon = ICON_MAP[item.icon];
        if (!Icon) return null;
        return <Icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "opacity-100" : "opacity-60")} />;
      })()}
      <span>{item.label}</span>
    </Link>
  );
}
