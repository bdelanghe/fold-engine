import { runValidate } from "./validate.ts";

export const runBuild = async (): Promise<void> => {
  await runValidate();
};
