import type { CliExtensionGeneratorOptions } from "./cli-extension.js";
import type {
  GeneratorPublicationOptions,
  GeneratorPublicationResult,
} from "./publish-generator-tree.js";

/** Source-only extension authoring needs no Habitat or Nx workspace discovery. */
export async function runCliExtensionGenerator(
  options: CliExtensionGeneratorOptions,
  publication: GeneratorPublicationOptions = {}
): Promise<GeneratorPublicationResult> {
  const root = process.cwd();
  const { FsTree } = await import("nx/src/generators/tree.js");
  const { default: createCliExtension } = await import("./cli-extension.js");
  const { publishGeneratorTree } = await import("./publish-generator-tree.js");
  const tree = new FsTree(root, false);
  createCliExtension(tree, options);
  return publishGeneratorTree(tree, publication);
}
