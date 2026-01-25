import { runExport } from "./export.ts";
import { runRender } from "./render.ts";
import { runValidate } from "./validate.ts";

export const runBuild = async (): Promise<void> => {
  await runValidate();
  await runRender();
  await runExport();
};
