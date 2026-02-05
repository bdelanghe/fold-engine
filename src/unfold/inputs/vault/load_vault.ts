import { walk } from "@std/fs";
import { relative } from "@std/path";
import { vaultConfig, DEFAULT_VAULT_DIRS } from "./vault_config.ts";

export const loadVaultRoot = (): URL => {
  return vaultConfig.vaultUrl;
};

/** Obsidian accepted file extensions by type */
export const ACCEPTED_EXTENSIONS = {
  markdown: new Set([".md"]),
  canvas: new Set([".canvas"]),
  base: new Set([".base"]),
  image: new Set([
    ".avif",
    ".bmp",
    ".gif",
    ".jpeg",
    ".jpg",
    ".png",
    ".svg",
    ".webp",
  ]),
  audio: new Set([".flac", ".m4a", ".mp3", ".ogg", ".wav", ".webm", ".3gp"]),
  video: new Set([".mkv", ".mov", ".mp4", ".ogv", ".webm"]),
  pdf: new Set([".pdf"]),
} as const;

type FileType = keyof typeof ACCEPTED_EXTENSIONS | "unknown";

export type VaultFile = {
  path: string;
  type: FileType;
  extension: string;
};

export type VaultManifest = {
  root: string;
  hasConfig: boolean;
  files: VaultFile[];
  invalidFiles: VaultFile[];
};

const getFileType = (ext: string): FileType => {
  const lower = ext.toLowerCase();
  for (const [type, extensions] of Object.entries(ACCEPTED_EXTENSIONS)) {
    if (extensions.has(lower)) return type as FileType;
  }
  return "unknown";
};

const IGNORED_PREFIXES = [
  ".cursor/",
  ".devcontainer/",
  ".git/",
  ".github/",
  ".unfold/",
  ".vscode/",
  "dist/",
  "node_modules/",
  "src/",
  "src/unfold/vault_api/support/",
  "vendor/",
];

const IGNORED_FILES = new Set([
  ".cursorindexingignore",
  ".dockerignore",
  ".gitignore",
  ".nojekyll",
  "deno.json",
  "deno.lock",
  "docker-bake.hcl",
  "docker-compose.yml",
  "Dockerfile",
]);

/** Scan vault and produce a manifest */
export const scanVault = async (vaultRoot?: URL): Promise<VaultManifest> => {
  const root = vaultRoot ?? loadVaultRoot();
  const rootPath = root.pathname;

  let hasConfig = false;
  const files: VaultFile[] = [];
  const invalidFiles: VaultFile[] = [];
  const ignoredPrefixes = [...IGNORED_PREFIXES];

  try {
    await Deno.stat(root);
  } catch {
    return { root: rootPath, hasConfig: false, files, invalidFiles };
  }

  try {
    await Deno.stat(new URL(".obsidian", root));
    hasConfig = true;
  } catch {
    hasConfig = false;
  }

  const normalizedRoot = rootPath.replace(/\/$/, "");
  for (const candidate of DEFAULT_VAULT_DIRS) {
    if (normalizedRoot.endsWith(`/${candidate}`)) {
      ignoredPrefixes.push(`${candidate}/`);
      break;
    }
  }

  for await (const entry of walk(root, { includeDirs: false })) {
    const relPath = relative(rootPath, entry.path);

    // Skip .obsidian config, hidden files, and Lume includes
    if (
      relPath.startsWith(".obsidian") ||
      relPath.startsWith(".") ||
      relPath.startsWith("_includes/")
    ) {
      continue;
    }
    if (
      IGNORED_FILES.has(relPath) ||
      ignoredPrefixes.some((prefix) => relPath.startsWith(prefix))
    ) {
      continue;
    }

    const ext = relPath.includes(".")
      ? relPath.slice(relPath.lastIndexOf("."))
      : "";
    const type = getFileType(ext);

    const file: VaultFile = { path: relPath, type, extension: ext };

    if (type === "unknown") {
      invalidFiles.push(file);
    } else {
      files.push(file);
    }
  }

  return { root: rootPath, hasConfig, files, invalidFiles };
};

/** Validate vault structure, returns error messages */
export const validateVault = async (vaultRoot?: URL): Promise<string[]> => {
  const manifest = await scanVault(vaultRoot);
  const errors: string[] = [];

  if (!manifest.hasConfig) {
    errors.push("Missing .obsidian/ configuration folder");
  }

  if (manifest.files.length === 0) {
    errors.push("Vault contains no valid files");
  }

  for (const file of manifest.invalidFiles) {
    errors.push(`Invalid file type: ${file.path} (${file.extension})`);
  }

  return errors;
};
