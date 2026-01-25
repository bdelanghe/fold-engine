import { validateNotes } from "../inputs/frontmatter/validate.ts";

export const runValidate = async (): Promise<void> => {
  await validateNotes();
};
