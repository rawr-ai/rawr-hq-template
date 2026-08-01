import { readNxJson, type Tree, updateNxJson } from "@nx/devkit";

const TEMPORAL_INQUIRY_PLUGIN = "@habitat/cli/temporal-inquiry-nx-plugin";

function pluginIdentity(plugin: string | { readonly plugin: string }): string {
  return typeof plugin === "string" ? plugin : plugin.plugin;
}

/** Idempotently installs the explicit temporal-inquiry Nx projection. */
export function temporalInquiryInitGenerator(tree: Tree): void {
  const nxJson = readNxJson(tree) ?? {};
  const plugins = [...(nxJson.plugins ?? [])];
  if (!plugins.some((plugin) => pluginIdentity(plugin) === TEMPORAL_INQUIRY_PLUGIN)) {
    plugins.push(TEMPORAL_INQUIRY_PLUGIN);
    updateNxJson(tree, { ...nxJson, plugins });
  }
}

export default temporalInquiryInitGenerator;
