import { walk } from "@std/fs";
import { dirname, join, relative } from "@std/path";
import type { VaultIndex } from "../../vault_api/contract.ts";
import { encodeVaultPath, sanitizeVaultPath } from "../../vault_api/path.ts";

const getVaultBaseUrl = (): string | undefined => {
  const raw = Deno.env.get("VAULT_BASE_URL")?.trim();
  return raw && raw.length > 0 ? raw : undefined;
};

const shouldRequireBaseUrl = (): boolean => {
  const raw = Deno.env.get("VAULT_REQUIRE_BASE_URL")?.trim();
  return raw === "1" || raw?.toLowerCase() === "true";
};

const getCacheRoot = (): string => join(Deno.cwd(), ".unfold", "vault");

const getIndexPath = (cacheRoot: string): string =>
  join(cacheRoot, ".vault-index.json");

const readIndex = async (indexPath: string): Promise<VaultIndex | null> => {
  try {
    const data = await Deno.readTextFile(indexPath);
    return JSON.parse(data) as VaultIndex;
  } catch {
    return null;
  }
};

const normalizeRelativePath = (root: string, fullPath: string): string => {
  const rel = relative(root, fullPath);
  return rel.replaceAll("\\", "/");
};

const fetchIndex = async (baseUrl: string): Promise<VaultIndex> => {
  const url = new URL("/v1/index", baseUrl);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Vault API index failed (${response.status})`);
  }
  return await response.json() as VaultIndex;
};

const sha256Hex = async (data: Uint8Array): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const downloadFile = async (
  baseUrl: string,
  relPath: string,
  targetPath: string,
  expectedHash: string,
): Promise<void> => {
  const url = new URL(`/v1/files/${encodeVaultPath(relPath)}`, baseUrl);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Vault API file fetch failed for ${relPath}`);
  }
  const buffer = new Uint8Array(await response.arrayBuffer());
  const actualHash = await sha256Hex(buffer);
  if (actualHash !== expectedHash) {
    throw new Error(`Vault API hash mismatch for ${relPath}`);
  }
  await Deno.mkdir(dirname(targetPath), { recursive: true });
  await Deno.writeFile(targetPath, buffer);
};

export const prepareVault = async (): Promise<void> => {
  const baseUrl = getVaultBaseUrl();
  if (!baseUrl) {
    if (shouldRequireBaseUrl()) {
      throw new Error("VAULT_BASE_URL is required but not set");
    }
    return;
  }

  const cacheRoot = getCacheRoot();
  await Deno.mkdir(cacheRoot, { recursive: true });
  const indexPath = getIndexPath(cacheRoot);

  const [index, previousIndex] = await Promise.all([
    fetchIndex(baseUrl),
    readIndex(indexPath),
  ]);

  const previousHashes = new Map(
    (previousIndex?.entries ?? []).map((entry) => [entry.path, entry.sha256]),
  );
  const expectedPaths = new Set<string>();

  for (const entry of index.entries) {
    const relPath = sanitizeVaultPath(entry.path);
    expectedPaths.add(relPath);
    const targetPath = join(cacheRoot, relPath);
    const previousHash = previousHashes.get(relPath);
    if (previousHash && previousHash === entry.sha256) {
      try {
        const stat = await Deno.stat(targetPath);
        if (stat.isFile) {
          continue;
        }
      } catch {
        // Fall through to download if the file is missing.
      }
    }
    await downloadFile(baseUrl, relPath, targetPath, entry.sha256);
  }

  for await (const entry of walk(cacheRoot, { includeDirs: false })) {
    const relPath = normalizeRelativePath(cacheRoot, entry.path);
    if (relPath === ".vault-index.json") {
      continue;
    }
    if (!expectedPaths.has(relPath)) {
      await Deno.remove(entry.path);
    }
  }

  await Deno.writeTextFile(indexPath, JSON.stringify(index, null, 2));
  Deno.env.set("VAULT_PATH", cacheRoot);
};
