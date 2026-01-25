import { assertEquals } from "@std/assert";
import type { Page } from "lume/core/file.ts";
import { DOMParser } from "deno-dom-wasm";
import {
  buildExternalLinksHtml,
  buildExternalLinksXml,
  collectExternalLinks,
} from "./external_links.ts";

const createPage = (html: string, url: string): Page => {
  const document = new DOMParser().parseFromString(html, "text/html");
  if (!document) {
    throw new Error("Failed to parse HTML");
  }
  return {
    document,
    data: { url },
  } as unknown as Page;
};

Deno.test("collectExternalLinks extracts external hrefs with sources", () => {
  const page = createPage(
    `
      <html>
        <head>
          <link rel="canonical" href="https://unfold.robertdelanghe.com/readme/" />
        </head>
        <body>
          <a href="/internal/">Internal</a>
          <a href="https://example.com/foo">External</a>
          <a href="mailto:test@example.com">Mail</a>
        </body>
      </html>
    `,
    "/readme/",
  );
  const entries = collectExternalLinks([page], {
    siteUrl: "https://unfold.robertdelanghe.com",
  });
  assertEquals(entries.length, 1);
  assertEquals(entries[0]?.href, "https://example.com/foo");
  assertEquals(entries[0]?.sources, [
    "https://unfold.robertdelanghe.com/readme/",
  ]);
});

Deno.test("external links outputs include generated metadata", () => {
  const entries = [
    {
      href: "https://example.com/foo",
      sources: ["https://unfold.robertdelanghe.com/readme/"],
    },
  ];
  const xml = buildExternalLinksXml(entries, {
    siteUrl: "https://unfold.robertdelanghe.com",
    generatedAt: "2026-01-25T08:00:00.000Z",
  });
  assertEquals(
    xml.includes(`site="https://unfold.robertdelanghe.com"`),
    true,
  );
  assertEquals(xml.includes(`<link href="https://example.com/foo">`), true);

  const html = buildExternalLinksHtml(entries, {
    siteUrl: "https://unfold.robertdelanghe.com",
    generatedAt: "2026-01-25T08:00:00.000Z",
  });
  assertEquals(html.includes("External Links"), true);
  assertEquals(html.includes("https://example.com/foo"), true);
});
