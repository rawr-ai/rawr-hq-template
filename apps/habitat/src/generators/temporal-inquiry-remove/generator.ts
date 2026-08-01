import { readNxJson, type Tree, updateNxJson } from "@nx/devkit";

const TEMPORAL_INQUIRY_PLUGIN = "@habitat/cli/temporal-inquiry-nx-plugin";

function pluginIdentity(plugin: string | { readonly plugin: string }): string {
  return typeof plugin === "string" ? plugin : plugin.plugin;
}

/** Removes only the temporal-inquiry Nx projection and preserves all other Nx state. */
export function temporalInquiryRemoveGenerator(tree: Tree): void {
  const nxJson = readNxJson(tree) ?? {};
  const plugins = (nxJson.plugins ?? []).filter(
    (plugin) => pluginIdentity(plugin) !== TEMPORAL_INQUIRY_PLUGIN
  );
  if (plugins.length === (nxJson.plugins ?? []).length) return;
  updateNxJson(tree, {
    ...nxJson,
    ...(plugins.length === 0 ? { plugins: undefined } : { plugins }),
  });
}

export default temporalInquiryRemoveGenerator;
