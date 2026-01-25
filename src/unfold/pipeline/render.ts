import { prepareVault } from "../inputs/vault/prepare_vault.ts";
import { createSite } from "../site/site.ts";

export const runRender = async (): Promise<void> => {
  await prepareVault();
  const site = createSite();
  await site.build();
};
