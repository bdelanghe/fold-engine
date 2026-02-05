import { assertEquals, assertMatch, assertThrows } from "@std/assert";
import {
  buildRedirectDocumentFromJsonLd,
  buildRedirectHtmlFromJsonLd,
  buildSemanticDocument,
  type HtmlDocument,
  HtmlDocumentSchema,
  renderHtmlDocument,
  renderSemanticDocument,
  SemanticHtmlNodeSchema,
} from "./html_document.ts";

Deno.test("renderHtmlDocument escapes text and attributes", () => {
  const document: HtmlDocument = {
    lang: 'en"><script>',
    head: [
      { tag: "meta", attrs: { charset: "utf-8" } },
      {
        tag: "title",
        children: ["Hello & <World>"],
      },
    ],
    body: [
      {
        tag: "a",
        attrs: { href: 'https://example.org/?q="x"&y=<y>' },
        children: ["Click <here> & go"],
      },
    ],
  };
  const html = renderHtmlDocument(document);
  assertMatch(html, /lang="en&quot;&gt;&lt;script&gt;"/);
  assertMatch(html, /<title>Hello &amp; &lt;World&gt;<\/title>/);
  assertMatch(
    html,
    /href="https:\/\/example\.org\/\?q=&quot;x&quot;&amp;y=&lt;y&gt;"/,
  );
  assertMatch(html, /Click &lt;here&gt; &amp; go/);
});

Deno.test("buildRedirectDocumentFromJsonLd builds canonical head/body", () => {
  const document = buildRedirectDocumentFromJsonLd({
    "@id": "https://example.org/pages/hello",
    name: "Hello WebPage",
    inLanguage: "en",
  });
  const parsed = HtmlDocumentSchema.parse(document);
  assertEquals(parsed.lang, "en");
  const headTags = parsed.head.map((node) => node.tag);
  assertEquals(headTags, ["meta", "meta", "meta", "title", "link"]);
  const bodyAnchor = parsed.body[0] as { tag: string; children?: unknown[] };
  assertEquals(bodyAnchor.tag, "p");
});

Deno.test("buildRedirectHtmlFromJsonLd renders refresh and canonical", () => {
  const html = buildRedirectHtmlFromJsonLd({
    url: "https://example.org/pages/hello",
    name: "Hello WebPage",
    inLanguage: { "@value": "en" },
  });
  assertMatch(html, /http-equiv="refresh"/);
  assertMatch(html, /content="0; url=https:\/\/example\.org\/pages\/hello"/);
  assertMatch(html, /<title>Hello WebPage<\/title>/);
  assertMatch(html, /rel="canonical"/);
});

Deno.test("SemanticHtmlNodeSchema rejects non-semantic tags", () => {
  assertThrows(() => {
    SemanticHtmlNodeSchema.parse({ tag: "div" });
  });
});

Deno.test("buildSemanticDocument wraps semantic landmarks", () => {
  const document = buildSemanticDocument({
    lang: "en",
    head: [{ tag: "meta", attrs: { charset: "utf-8" } }],
    nav: [{ tag: "a", attrs: { href: "/home" }, children: ["Home"] }],
    main: [{ tag: "article", children: [{ tag: "h1", children: ["Title"] }] }],
    footer: [{ tag: "p", children: ["Footer"] }],
  });
  const parsed = HtmlDocumentSchema.parse(document);
  assertEquals(parsed.body.map((node) => node.tag), ["nav", "main", "footer"]);
  const html = renderSemanticDocument({
    lang: "en",
    head: [{ tag: "meta", attrs: { charset: "utf-8" } }],
    main: [{ tag: "section", children: ["Hello"] }],
  });
  assertMatch(html, /<main><section>Hello<\/section><\/main>/);
});
