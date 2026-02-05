import { validateNotes } from "../notes/validate_frontmatter.ts";

Deno.test("notes schema validation", async () => {
  await validateNotes();
});
