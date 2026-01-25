import { validateNotes } from "./validate.ts";

Deno.test("notes schema validation", async () => {
  const readAccess = await Deno.permissions.query({ name: "read" });
  const envAccess = await Deno.permissions.query({ name: "env" });
  if (readAccess.state !== "granted" || envAccess.state !== "granted") {
    console.warn("Skipping notes schema validation (missing permissions).");
    return;
  }

  await validateNotes();
});
