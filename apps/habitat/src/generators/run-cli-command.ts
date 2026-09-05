import type { CliCommandGeneratorOptions } from "./cli-command.js";
import type {
  GeneratorPublicationOptions,
  GeneratorPublicationResult,
} from "./publish-generator-tree.js";

/** The operator's invocation directory is the exact official-authoring Tree root. */
export async function runCliCommandGenerator(
  options: CliCommandGeneratorOptions,
  publication: GeneratorPublicationOptions = {}
): Promise<GeneratorPublicationResult> {
  const root = process.cwd();
  const { FsTree } = await import("nx/src/generators/tree.js");
  const { default: createCliCommand } = await import("./cli-command.js");
  const { publishGeneratorTree } = await import("./publish-generator-tree.js");
  const tree = new FsTree(root, false);
  createCliCommand(tree, options);
  return publishGeneratorTree(tree, publication);
}
