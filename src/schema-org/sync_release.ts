import { copy } from "@std/fs";
import { join } from "@std/path";

type Options = {
  release: string;
  repo: string;
  dest: string;
  temp: string | null;
  force: boolean;
  keepTemp: boolean;
};

const DEFAULT_REPO = "https://github.com/schemaorg/schemaorg";
const DEFAULT_DEST = join(Deno.cwd(), "schemas", "schema-org", "releases");

const parseArgs = (args: string[]): Options => {
  const opts: Options = {
    release: "29.4",
    repo: DEFAULT_REPO,
    dest: DEFAULT_DEST,
    temp: null,
    force: false,
    keepTemp: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg) continue;
    if (arg === "--release") {
      opts.release = args[i + 1] ?? opts.release;
      i += 1;
      continue;
    }
    if (arg === "--repo") {
      opts.repo = args[i + 1] ?? opts.repo;
      i += 1;
      continue;
    }
    if (arg === "--dest") {
      opts.dest = args[i + 1] ?? opts.dest;
      i += 1;
      continue;
    }
    if (arg === "--temp") {
      opts.temp = args[i + 1] ?? opts.temp;
      i += 1;
      continue;
    }
    if (arg === "--force") {
      opts.force = true;
      continue;
    }
    if (arg === "--keep-temp") {
      opts.keepTemp = true;
      continue;
    }
  }

  return opts;
};

const pathExists = async (path: string): Promise<boolean> => {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }
    throw error;
  }
};

const ensureCleanDest = async (path: string, force: boolean): Promise<void> => {
  if (await pathExists(path)) {
    if (!force) {
      throw new Error(
        `Destination already exists: ${path}. Use --force to overwrite.`,
      );
    }
    await Deno.remove(path, { recursive: true });
  }
};

const cloneRepo = async (repo: string, tempDir: string): Promise<void> => {
  const command = new Deno.Command("git", {
    args: ["clone", repo, tempDir],
  });
  const result = await command.output();
  if (result.code !== 0) {
    const decoder = new TextDecoder();
    throw new Error(
      `git clone failed:\n${decoder.decode(result.stderr)}`.trim(),
    );
  }
};

const resolveRepoRoot = async (
  repo: string,
  tempDir: string,
): Promise<string> => {
  const isRemote = repo.startsWith("http://") || repo.startsWith("https://");
  if (isRemote) {
    await cloneRepo(repo, tempDir);
    return tempDir;
  }

  const resolved = repo.startsWith("/")
    ? repo
    : join(Deno.cwd(), repo);
  if (!(await pathExists(resolved))) {
    throw new Error(`Repo path not found: ${resolved}`);
  }
  return resolved;
};

const assertReleaseDir = async (releaseDir: string): Promise<void> => {
  const contextPath = join(releaseDir, "schemaorgcontext.jsonld");
  if (!(await pathExists(contextPath))) {
    throw new Error(
      `Missing schemaorgcontext.jsonld in release directory: ${releaseDir}`,
    );
  }
};

const run = async (): Promise<void> => {
  const opts = parseArgs(Deno.args);
  const tempDir = opts.temp ?? await Deno.makeTempDir();
  const repoRoot = await resolveRepoRoot(opts.repo, tempDir);
  const releaseDir = join(repoRoot, "data", "releases", opts.release);

  await assertReleaseDir(releaseDir);

  const destRelease = join(opts.dest, opts.release);
  await ensureCleanDest(destRelease, opts.force);
  await Deno.mkdir(opts.dest, { recursive: true });
  await copy(releaseDir, destRelease, { overwrite: true });

  if (!opts.keepTemp && repoRoot === tempDir) {
    await Deno.remove(tempDir, { recursive: true });
  }
};

if (import.meta.main) {
  run().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    const encoder = new TextEncoder();
    void Deno.stderr.write(encoder.encode(`${message}\n`));
    Deno.exit(1);
  });
}
