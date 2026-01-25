import { walk } from "@std/fs";
import { relative } from "@std/path";

export const loadVaultRoot = (): URL =>
  new URL("../../../../obsidian_vault/", import.meta.url);

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

/** Scan vault and produce a manifest */
export const scanVault = async (vaultRoot?: URL): Promise<VaultManifest> => {
  const root = vaultRoot ?? loadVaultRoot();
  const rootPath = root.pathname;

  let hasConfig = false;
  const files: VaultFile[] = [];
  const invalidFiles: VaultFile[] = [];

  try {
    await Deno.stat(new URL(".obsidian", root));
    hasConfig = true;
  } catch {
    hasConfig = false;
  }

  for await (const entry of walk(root, { includeDirs: false })) {
    const relPath = relative(rootPath, entry.path);

    // Skip .obsidian config and hidden files
    if (relPath.startsWith(".obsidian") || relPath.startsWith(".")) continue;

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
