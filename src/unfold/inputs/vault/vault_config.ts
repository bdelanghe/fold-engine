import { isAbsolute, join, toFileUrl } from "@std/path";

const DEFAULT_VAULT_DIRS = ["example-vault", "vault"];

const resolveVaultPath = (): string => {
  const override = Deno.env.get("VAULT_PATH")?.trim();
  if (override) {
    return isAbsolute(override) ? override : join(Deno.cwd(), override);
  }

  const cwd = Deno.cwd().replace(/\/$/, "");
  for (const candidate of DEFAULT_VAULT_DIRS) {
    try {
      const candidatePath = join(cwd, candidate);
      const stat = Deno.statSync(candidatePath);
      if (stat.isDirectory) {
        return candidatePath;
      }
    } catch {
      // continue to next candidate
    }
  }

  return join(cwd, DEFAULT_VAULT_DIRS[0]);
};

const normalizePathWithSlash = (value: string): string => {
  const normalized = value.replace(/\/$/, "");
  return `${normalized}/`;
};

export type VaultConfig = {
  vaultPath: string;
  vaultUrl: URL;
};

const vaultPath = resolveVaultPath();
export const vaultConfig: VaultConfig = {
  vaultPath,
  vaultUrl: toFileUrl(normalizePathWithSlash(vaultPath)),
};

export { DEFAULT_VAULT_DIRS };
