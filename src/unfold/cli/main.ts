type CommandDependencies = {
  validateNotes: () => Promise<void>;
  buildSite: () => Promise<void>;
  build: () => Promise<void>;
  cache: () => Promise<void>;
  dev: () => Promise<void>;
  docs: () => Promise<void>;
  output: (text: string) => void;
  error: (text: string) => void;
};

const usage = `unfold <command>

Commands:
  validate     Validate vault notes
  cache        Cache and vendor Lume deps
  build:site   Build site output
  build        Cache, validate, and build site
  dev          Start dev server
  docs         Generate Unfold docs
`;

const runCommand = async (
  command: string,
  deps: CommandDependencies,
): Promise<number> => {
  switch (command) {
    case "validate":
      await deps.validateNotes();
      return 0;
    case "cache":
      await deps.cache();
      return 0;
    case "build:site":
      await deps.buildSite();
      return 0;
    case "build":
      await deps.cache();
      await deps.build();
      return 0;
    case "dev":
      await deps.dev();
      return 0;
    case "docs":
      await deps.docs();
      return 0;
    case "":
    case "help":
    case "--help":
    case "-h":
      deps.output(usage);
      return 0;
    default:
      deps.error(`Unknown command: ${command}\n\n${usage}`);
      return 1;
  }
};

const runCommandProcess = async (args: string[]): Promise<void> => {
  const command = new Deno.Command(Deno.execPath(), { args });
  const result = await command.output();
  if (result.code !== 0) {
    const decoder = new TextDecoder();
    const stdout = decoder.decode(result.stdout);
    const stderr = decoder.decode(result.stderr);
    throw new Error(
      `Command failed (code ${result.code}).\n${stdout}\n${stderr}`.trim(),
    );
  }
};

const createDefaultDependencies = async (): Promise<CommandDependencies> => {
  const { runBuild } = await import("../pipeline/build.ts");
  const { runRender } = await import("../pipeline/render.ts");
  const { runValidate } = await import("../pipeline/validate.ts");
  const { createSite } = await import("../site/site.ts");

  return {
    validateNotes: runValidate,
    buildSite: runRender,
    build: runBuild,
    cache: async () => {
      await runCommandProcess([
        "cache",
        "--vendor",
        "src/unfold/site/site.ts",
      ]);
    },
    dev: async () => {
      const site = createSite();
      await site.build();
      const server = site.getServer();
      server.options.hostname = "0.0.0.0";
      server.options.port = 3000;
      await server.start();
    },
    docs: async () => {
      await runCommandProcess([
        "doc",
        "--html",
        "--output=dist/unfold",
        "src/unfold",
      ]);
    },
    output: (text: string) => console.log(text),
    error: (text: string) => console.error(text),
  };
};

export const run = async (
  args: string[],
  deps?: CommandDependencies,
): Promise<number> => {
  const command = args[0] ?? "";
  const resolvedDeps = deps ?? await createDefaultDependencies();
  return runCommand(command, resolvedDeps);
};

if (import.meta.main) {
  const code = await run(Deno.args);
  Deno.exit(code);
}
