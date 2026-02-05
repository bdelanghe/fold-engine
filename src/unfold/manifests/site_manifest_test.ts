import { assertEquals } from "@std/assert";
import { buildSiteManifest, parseHtml } from "./site_manifest.ts";

Deno.test("buildSiteManifest extracts basic fields", async () => {
  const html = `
    <!doctype html>
    <html>
      <head>
        <title>Test Page</title>
        <link rel="canonical" href="https://example.test/page/" />
        <script type="application/ld+json">{"@context":"https://schema.org/"}</script>
      </head>
      <body>
        <h1>Heading</h1>
        <a href="/a/">A</a>
      </body>
    </html>
  `;
  const document = await parseHtml(html, "site manifest test");

  const page = {
    data: { url: "/page/" },
    document,
  } as Parameters<typeof buildSiteManifest>[0][number];

  const manifest = await buildSiteManifest([page]);
  const entry = manifest.pages[0];

  assertEquals(entry.url, "/page/");
  assertEquals(entry.title, "Test Page");
  assertEquals(entry.h1, "Heading");
  assertEquals(entry.canonical, "https://example.test/page/");
  assertEquals(entry.links, ["/a/"]);
  assertEquals(entry.jsonLd.length, 1);
});
