import { updateVaultSitemap } from "../exporters/vault_sitemap.ts";

export const runExport = async (): Promise<void> => {
  await updateVaultSitemap();
};
