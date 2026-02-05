import type React from "react";
import { useSyncExternalStore } from "react";

type NavigateOptions = Readonly<{
  replace?: boolean;
}>;

const ROUTER_EVENT = "rawr:navigate";

function getPathnameSnapshot() {
  return window.location.pathname;
}

function subscribeToPathname(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener(ROUTER_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener(ROUTER_EVENT, onStoreChange);
  };
}

export function usePathname() {
  return useSyncExternalStore(
    subscribeToPathname,
    getPathnameSnapshot,
    () => "/",
  );
}

export function navigate(to: string, options: NavigateOptions = {}) {
  if (options.replace) {
    window.history.replaceState(null, "", to);
  } else {
    window.history.pushState(null, "", to);
  }

  window.dispatchEvent(new PopStateEvent("popstate"));
  window.dispatchEvent(new Event(ROUTER_EVENT));
}

export type LinkProps = Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  "href" | "onClick"
> & {
  to: string;
  replace?: boolean;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};

export function Link({ to, replace, onClick, ...props }: LinkProps) {
  return (
    <a
      {...props}
      href={to}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (event.button !== 0) return;
        if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;
        if (props.target && props.target !== "_self") return;

        event.preventDefault();
        navigate(to, { replace });
      }}
    />
  );
}

export type Route = Readonly<{
  path: string;
  element: React.ReactNode;
}>;

function matchesPath(routePath: string, pathname: string) {
  if (routePath === pathname) return true;
  if (!routePath.endsWith("/*")) return false;

  const base = routePath.slice(0, -2);
  if (base === "") return true;
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function Router({
  routes,
  fallback,
}: {
  routes: readonly Route[];
  fallback: React.ReactNode;
}) {
  const pathname = usePathname();

  for (const route of routes) {
    if (matchesPath(route.path, pathname)) return route.element;
  }

  return fallback;
}

