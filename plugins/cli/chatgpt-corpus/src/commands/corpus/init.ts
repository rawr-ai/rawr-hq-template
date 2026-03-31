import path from "node:path";
import { Args } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import { createCorpusClient, createInvocation, describeServiceError } from "../../lib/client";

export default class CorpusInit extends RawrCommand {
  static description = "Initialize a ChatGPT corpus workspace";

  static args = {
    path: Args.string({ required: false, description: "Workspace root path" }),
  } as const;

  static flags = {
    ...RawrCommand.baseFlags,
  } as const;

  async run() {
    const { args, flags } = await this.parseRawr(CorpusInit);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const workspaceRoot = path.resolve(args.path ? String(args.path) : process.cwd());
    const client = createCorpusClient(workspaceRoot);

    try {
      const data = await client.workspace.initialize(
        {},
        createInvocation(`corpus-init-${Date.now()}`),
      );
      const byFileId = new Map(data.managedFiles.map((file) => [file.fileId, file.relativePath]));
      const resultData = {
        workspaceRoot,
        createdPaths: data.createdEntries.map((entry) => path.join(workspaceRoot, ...entry.split("/"))),
        existingPaths: data.existingEntries.map((entry) => path.join(workspaceRoot, ...entry.split("/"))),
        files: {
          readmePath: path.join(workspaceRoot, ...(byFileId.get("workspace-readme") ?? "work/README.md").split("/")),
          gitignorePath: path.join(workspaceRoot, ...(byFileId.get("workspace-gitignore") ?? ".gitignore").split("/")),
        },
      };
      const result = this.ok(resultData);
      this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          this.log(`initialized corpus workspace at ${workspaceRoot}`);
          this.log(`created ${resultData.createdPaths.length} path(s), confirmed ${resultData.existingPaths.length} existing path(s)`);
        },
      });
    } catch (error) {
      const parsed = describeServiceError(error);
      const result = this.fail(parsed.message, { code: parsed.code, details: parsed.details });
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
    }
  }
}
