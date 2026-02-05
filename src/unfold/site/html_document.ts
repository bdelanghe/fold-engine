import { z } from "zod";

export type HtmlNode<Tag extends string = string> = {
  tag: Tag;
  attrs?: Record<string, string>;
  children?: Array<HtmlNode<Tag> | string>;
};

export type HtmlDocument<Node extends HtmlNode = HtmlNode> = {
  lang?: string;
  head: Node[];
  body: Node[];
};

export const HtmlNodeSchema: z.ZodType<HtmlNode> = z.lazy(() =>
  z.object({
    tag: z.string(),
    attrs: z.record(z.string()).optional(),
    children: z.array(z.union([HtmlNodeSchema, z.string()])).optional(),
  })
);

export const HtmlDocumentSchema = z.object({
  lang: z.string().optional(),
  head: z.array(HtmlNodeSchema),
  body: z.array(HtmlNodeSchema),
});

export const SemanticHtmlTagSchema = z.enum([
  "a",
  "address",
  "article",
  "aside",
  "blockquote",
  "code",
  "em",
  "figcaption",
  "figure",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "link",
  "main",
  "meta",
  "nav",
  "noscript",
  "ol",
  "p",
  "pre",
  "script",
  "section",
  "strong",
  "time",
  "title",
  "ul",
  "li",
]);

export type SemanticHtmlTag = z.infer<typeof SemanticHtmlTagSchema>;

export type SemanticHtmlNode = HtmlNode<SemanticHtmlTag>;

export const SemanticHtmlNodeSchema: z.ZodType<SemanticHtmlNode> = z.lazy(() =>
  z.object({
    tag: SemanticHtmlTagSchema,
    attrs: z.record(z.string()).optional(),
    children: z.array(z.union([SemanticHtmlNodeSchema, z.string()])).optional(),
  })
);

export type SemanticHtmlPage = {
  lang?: string;
  head: SemanticHtmlNode[];
  main: SemanticHtmlNode[];
  nav?: SemanticHtmlNode[];
  header?: SemanticHtmlNode[];
  footer?: SemanticHtmlNode[];
};

export const SemanticHtmlPageSchema = z.object({
  lang: z.string().optional(),
  head: z.array(SemanticHtmlNodeSchema),
  main: z.array(SemanticHtmlNodeSchema),
  nav: z.array(SemanticHtmlNodeSchema).optional(),
  header: z.array(SemanticHtmlNodeSchema).optional(),
  footer: z.array(SemanticHtmlNodeSchema).optional(),
});

export const JsonLdPageSchema = z
  .object({
    "@id": z.string().optional(),
    url: z.string().optional(),
    name: z.string().optional(),
    headline: z.string().optional(),
    inLanguage: z.unknown().optional(),
    description: z.string().optional(),
  })
  .passthrough();

export type JsonLdPage = z.infer<typeof JsonLdPageSchema>;

const voidElements = new Set(["meta", "link"]);
const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escapeAttr = (value: string) =>
  escapeHtml(value).replace(/"/g, "&quot;");

const renderNode = (node: HtmlNode | string): string => {
  if (typeof node === "string") {
    return escapeHtml(node);
  }
  const attrs = node.attrs
    ? " " +
      Object.entries(node.attrs)
        .map(([key, value]) => `${key}="${escapeAttr(value)}"`)
        .join(" ")
    : "";
  if (voidElements.has(node.tag)) {
    return `<${node.tag}${attrs}>`;
  }
  const children = node.children?.map(renderNode).join("") ?? "";
  return `<${node.tag}${attrs}>${children}</${node.tag}>`;
};

export const renderHtmlDocument = <Node extends HtmlNode>(
  document: HtmlDocument<Node>,
): string => {
  const head = document.head.map(renderNode).join("");
  const body = document.body.map(renderNode).join("");
  const lang = document.lang ? ` lang="${escapeAttr(document.lang)}"` : "";
  return `<!doctype html>
<html${lang}><head>${head}</head><body>${body}</body></html>
`;
};

export const buildSemanticDocument = (
  page: SemanticHtmlPage,
): HtmlDocument<SemanticHtmlNode> => {
  const parsed = SemanticHtmlPageSchema.parse(page);
  const body: SemanticHtmlNode[] = [];
  if (parsed.header?.length) {
    body.push({ tag: "header", children: parsed.header });
  }
  if (parsed.nav?.length) {
    body.push({ tag: "nav", children: parsed.nav });
  }
  body.push({ tag: "main", children: parsed.main });
  if (parsed.footer?.length) {
    body.push({ tag: "footer", children: parsed.footer });
  }
  return { lang: parsed.lang, head: parsed.head, body };
};

export const renderSemanticDocument = (page: SemanticHtmlPage): string => {
  const document = buildSemanticDocument(page);
  const validated = HtmlDocumentSchema.parse(document);
  return renderHtmlDocument(validated);
};

const getJsonLdString = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record["@value"] === "string") {
      return record["@value"];
    }
  }
  return undefined;
};

export const buildRedirectDocumentFromJsonLd = (
  jsonld: JsonLdPage,
): HtmlDocument => {
  const parsed = JsonLdPageSchema.parse(jsonld);
  const url = parsed.url ?? parsed["@id"];
  const title = parsed.name ?? parsed.headline ?? url;
  const lang = getJsonLdString(parsed.inLanguage);
  const head: HtmlNode[] = [
    { tag: "meta", attrs: { charset: "utf-8" } },
    {
      tag: "meta",
      attrs: { name: "viewport", content: "width=device-width, initial-scale=1" },
    },
  ];
  if (url) {
    head.push({
      tag: "meta",
      attrs: { "http-equiv": "refresh", content: `0; url=${url}` },
    });
  }
  if (title) {
    head.push({ tag: "title", children: [title] });
  }
  if (url) {
    head.push({ tag: "link", attrs: { rel: "canonical", href: url } });
  }

  const body: HtmlNode[] = [];
  if (url) {
    body.push({
      tag: "p",
      children: [
        {
          tag: "a",
          attrs: { href: url },
          children: [title ?? url],
        },
      ],
    });
  }

  return { lang, head, body };
};

export const buildRedirectHtmlFromJsonLd = (jsonld: JsonLdPage): string => {
  const document = buildRedirectDocumentFromJsonLd(jsonld);
  const validated = HtmlDocumentSchema.parse(document);
  return renderHtmlDocument(validated);
};
