import { assertEquals } from "@std/assert";
import { buildWikiHref, normalizeWikiTarget } from "./wikilinks.ts";

Deno.test("normalizeWikiTarget trims and slugifies", () => {
  assertEquals(normalizeWikiTarget(" My Note.md "), "my-note");
  assertEquals(normalizeWikiTarget("Folder/My Note"), "folder/my-note");
  assertEquals(normalizeWikiTarget(" / / "), "");
});

Deno.test("buildWikiHref respects prefix/suffix", () => {
  assertEquals(
    buildWikiHref("My Note", { prefix: "/", suffix: "/" }),
    "/my-note/",
  );
  assertEquals(
    buildWikiHref("Docs/Intro", { prefix: "/vault/", suffix: ".html" }),
    "/vault/docs/intro.html",
  );
});
