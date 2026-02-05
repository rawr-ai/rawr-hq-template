export type LocationLike = Readonly<{
  pathname: string;
  search: string;
  hash: string;
}>;

export type NavigateOptions = Readonly<{
  replace?: boolean;
}>;

export type MountContext = Readonly<{
  hostAppId: string;
  basePath?: string;
  getLocation: () => LocationLike;
  navigate: (to: string, options?: NavigateOptions) => void;
  onHostNavigate?: (listener: (location: LocationLike) => void) => () => void;
}>;

export type MountHandle = Readonly<{
  unmount?: () => void;
}>;

export type MountFn = (
  el: HTMLElement,
  ctx: MountContext,
) => void | MountHandle | Promise<void | MountHandle>;

export type MicroFrontendModule = Readonly<{
  mount: MountFn;
}>;

export function defineMicroFrontend(mount: MountFn): MicroFrontendModule {
  return { mount };
}

