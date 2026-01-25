import { createSite } from "../site/site.ts";

export const runRender = async (): Promise<void> => {
  const site = createSite();
  await site.build();
};
