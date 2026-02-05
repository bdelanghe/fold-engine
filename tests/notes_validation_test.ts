import { validateNotes } from "../scripts/validate_frontmatter.ts";

Deno.test("notes schema validation", async () => {
  await validateNotes();
});
