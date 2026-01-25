import { assertEquals } from "@std/assert";
import {
  buildSitemapLinkMap,
  buildWikiHref,
  normalizeWikiTarget,
} from "./wikilinks.ts";

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

Deno.test("buildWikiHref strips legacy fold-engine prefix", () => {
  assertEquals(
    buildWikiHref("readme", { prefix: "/fold-engine/", suffix: "/" }),
    "/readme/",
  );
});

Deno.test("buildSitemapLinkMap parses canonical urls", () => {
  const xml = `
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://unfold.robertdelanghe.com/</loc>
  </url>
  <url>
    <loc>https://unfold.robertdelanghe.com/readme/</loc>
  </url>
  <url>
    <loc>https://unfold.robertdelanghe.com/templates/standard-note/</loc>
  </url>
</urlset>
`;
  const map = buildSitemapLinkMap(xml);
  assertEquals(map.get("fold-engine"), "/");
  assertEquals(map.get("readme"), "/readme/");
  assertEquals(map.get("templates/standard-note"), "/templates/standard-note/");
});

Deno.test("buildWikiHref prefers sitemap mapping", () => {
  const xml = `
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://unfold.robertdelanghe.com/</loc>
  </url>
  <url>
    <loc>https://unfold.robertdelanghe.com/readme/</loc>
  </url>
  <url>
    <loc>https://unfold.robertdelanghe.com/templates/standard-note/</loc>
  </url>
</urlset>
`;
  const map = buildSitemapLinkMap(xml);
  assertEquals(
    buildWikiHref("readme", {
      prefix: "/fold-engine/",
      suffix: "/",
      sitemap: map,
    }),
    "/readme/",
  );
  assertEquals(
    buildWikiHref("templates/standard-note", {
      prefix: "/fold-engine/",
      suffix: "/",
      sitemap: map,
    }),
    "/templates/standard-note/",
  );
});
