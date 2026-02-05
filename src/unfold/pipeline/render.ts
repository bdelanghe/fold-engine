import { createSite } from "../site/site.ts";

/**
 * Render JSON-LD vault to HTML
 * Lume processes .jsonld files using the jsonld_loader
 */
export const runRender = async (): Promise<void> => {
  const site = createSite();
  await site.build();
};
