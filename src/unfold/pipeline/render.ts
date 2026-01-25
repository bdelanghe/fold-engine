import site from "../../../lume.config.ts";

export const runRender = async (): Promise<void> => {
  await site.build();
};
