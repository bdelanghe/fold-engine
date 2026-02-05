type EntryPoint = {
  url?: string;
  name?: string;
  role?: string;
};

type LayoutData = {
  title?: string;
  cog_schema?: string;
  url?: string;
  site?: {
    url?: string;
  };
  jsonld?: string | Record<string, unknown>;
  entrypoints?: EntryPoint[];
  content?: string;
};

const buildJsonLd = (data: LayoutData): string | null => {
  if (!data.jsonld) {
    return null;
  }

  if (data.jsonld !== "vault_index") {
    return typeof data.jsonld === "string"
      ? data.jsonld
      : JSON.stringify(data.jsonld, null, 2);
  }

  const siteUrl = data.site?.url ?? "";
  const pageUrl = data.url ? `${siteUrl}${data.url}` : "";
  const entrypoints = Array.isArray(data.entrypoints) ? data.entrypoints : [];
  const entrypointUrls = entrypoints
    .map((entry) => (entry.url ? `${siteUrl}${entry.url}` : ""))
    .filter(Boolean);

  const graph = [
    {
      "@id": `${siteUrl}/#site`,
      "@type": "schema:WebSite",
      name: data.title ?? "",
      url: `${siteUrl}/`,
    },
    {
      "@id": pageUrl,
      "@type": ["schema:CollectionPage", "basis:VaultIndex"],
      name: data.title ?? "",
      url: pageUrl,
      isPartOf: `${siteUrl}/#site`,
      role: "vault.index",
      entrypoint: entrypointUrls,
    },
    ...entrypoints
      .filter((entry) => entry.url)
      .map((entry) => ({
        "@id": `${siteUrl}${entry.url}`,
        "@type": ["schema:WebPage", "basis:Fold"],
        name: entry.name ?? "",
        url: `${siteUrl}${entry.url}`,
        role: entry.role ?? "",
      })),
  ];

  return JSON.stringify(
    {
      "@context": {
        schema: "https://schema.org/",
        basis: `${siteUrl}/vocab/basis#`,
        name: "schema:name",
        url: "schema:url",
        isPartOf: { "@id": "schema:isPartOf", "@type": "@id" },
        entrypoint: { "@id": "basis:entrypoint", "@type": "@id" },
        role: "basis:role",
      },
      "@graph": graph,
    },
    null,
    2,
  );
};

export default (data: LayoutData) => {
  const title = data.title ?? "";
  const siteUrl = data.site?.url ?? "";
  const pageUrl = data.url ? `${siteUrl}${data.url}` : "";
  const jsonld = buildJsonLd(data);
  const content = data.content ?? "";
  const hasContentH1 = /<h1[\s>]/i.test(content);
  const headerMarkup = hasContentH1
    ? ""
    : `<header>
          <h1 id="page-title" itemprop="headline">${title}</h1>
        </header>`;
  const articleLabel = hasContentH1 ? "" : ' aria-labelledby="page-title"';
  const canonicalMarkup = pageUrl
    ? `<link rel="canonical" href="${pageUrl}" />
      <meta itemprop="url" content="${pageUrl}" />`
    : "";
  const cogSchemaMarkup = data.cog_schema
    ? `<meta name="cog:schema" content="${data.cog_schema}" />`
    : "";
  const jsonldMarkup = jsonld
    ? `<script type="application/ld+json">${jsonld}</script>`
    : "";

  return `<!doctype html>
<html lang="en" itemscope itemtype="https://schema.org/WebPage">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    ${cogSchemaMarkup}
    <meta itemprop="inLanguage" content="en" />
    ${canonicalMarkup}
    ${jsonldMarkup}
  </head>
  <body>
    <a href="#content">Skip to content</a>
    <main id="content">
      <article${articleLabel} itemprop="mainEntity" itemscope itemtype="https://schema.org/Article">
        ${headerMarkup}
        ${content}
      </article>
    </main>
  </body>
</html>`;
};
