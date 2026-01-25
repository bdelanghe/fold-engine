// deno-lint-ignore-file camelcase
type EntryPoint = {
  url?: string;
  name?: string;
  role?: string;
};

type LayoutData = {
  title?: string;
  cog_schema?: string;
  description?: string;
  url?: string;
  site?: {
    url?: string;
    name?: string;
  };
  author?: {
    name?: string;
    url?: string;
  };
  date_published?: string;
  date_modified?: string;
  keywords?: string[] | string;
  image?: string;
  image_alt?: string;
  site_name?: string;
  twitter_site?: string;
  twitter_creator?: string;
  twitter_card?: string;
  robots?: string;
  article_type?: string;
  jsonld?: string | Record<string, unknown>;
  entrypoints?: EntryPoint[];
  content?: string;
};

const escapeAttribute = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const normalizeWhitespace = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const resolveUrl = (value: string, baseUrl: string): string => {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
};

const buildMetaDescription = (data: LayoutData, content: string): string => {
  const fromData = data.description
    ? normalizeWhitespace(data.description)
    : "";
  if (fromData) {
    return fromData.slice(0, 160);
  }

  const text = normalizeWhitespace(content.replace(/<[^>]*>/g, " "));
  return text ? text.slice(0, 160) : "";
};

const hasAttribute = (attrs: string, name: string): boolean =>
  new RegExp(`\\s${name}\\s*=`, "i").test(attrs);

const ensureAttribute = (
  attrs: string,
  name: string,
  value: string,
): string => {
  if (hasAttribute(attrs, name)) {
    return attrs;
  }
  return `${attrs} ${name}="${escapeAttribute(value)}"`;
};

const addListAccessibility = (
  content: string,
  listLabel: string,
): string => {
  const label = listLabel || "List";
  const enhanceListAttrs = (attrs: string): string => {
    let updated = ensureAttribute(attrs, "role", "list");
    if (
      !hasAttribute(updated, "aria-label") &&
      !hasAttribute(updated, "aria-labelledby")
    ) {
      updated = ensureAttribute(updated, "aria-label", label);
    }
    return updated;
  };

  const enhanceItemAttrs = (attrs: string): string =>
    ensureAttribute(attrs, "role", "listitem");

  return content
    .replace(
      /<ul(\s[^>]*)?>/gi,
      (_match, attrs = "") => `<ul${enhanceListAttrs(attrs)}>`,
    )
    .replace(
      /<ol(\s[^>]*)?>/gi,
      (_match, attrs = "") => `<ol${enhanceListAttrs(attrs)}>`,
    )
    .replace(
      /<li(\s[^>]*)?>/gi,
      (_match, attrs = "") => `<li${enhanceItemAttrs(attrs)}>`,
    );
};

const buildJsonLd = (
  data: LayoutData,
  description: string,
  resolvedImage: string,
): string | null => {
  if (!data.jsonld) {
    const siteUrl = data.site?.url ?? "";
    const pageUrl = data.url ? `${siteUrl}${data.url}` : "";
    const webpageId = pageUrl ? `${pageUrl}#webpage` : "";
    const articleId = pageUrl ? `${pageUrl}#article` : "";
    const websiteId = siteUrl ? `${siteUrl}/#website` : "";
    const title = data.title ?? "";
    const authorName = data.author?.name ?? "";
    const authorUrl = data.author?.url ?? "";
    const keywords = Array.isArray(data.keywords)
      ? data.keywords
      : data.keywords ?? "";
    const siteName = data.site?.name ?? data.site_name ?? "";
    const articleType = data.article_type ?? "Article";

    const webpage: Record<string, unknown> = {
      "@id": webpageId || pageUrl,
      "@type": "WebPage",
      url: pageUrl || undefined,
      name: title || undefined,
      inLanguage: "en",
      isPartOf: websiteId || undefined,
      mainEntity: articleId || undefined,
      description: description || undefined,
      image: resolvedImage || undefined,
    };

    const article: Record<string, unknown> = {
      "@id": articleId || undefined,
      "@type": articleType,
      headline: title || undefined,
      description: description || undefined,
      mainEntityOfPage: webpageId || pageUrl || undefined,
      inLanguage: "en",
      image: resolvedImage || undefined,
      author: authorName
        ? {
          "@type": "Person",
          name: authorName,
          url: authorUrl || undefined,
        }
        : undefined,
      datePublished: data.date_published || undefined,
      dateModified: data.date_modified || undefined,
      keywords: keywords || undefined,
    };

    const website: Record<string, unknown> = {
      "@id": websiteId || undefined,
      "@type": "WebSite",
      name: siteName || title || undefined,
      url: siteUrl || undefined,
    };

    const graph = [webpage, article, website].map((node) =>
      Object.fromEntries(
        Object.entries(node).filter(([, value]) =>
          value !== "" && value !== null && value !== undefined
        ),
      )
    );

    return JSON.stringify(
      { "@context": "https://schema.org", "@graph": graph },
      null,
      2,
    );
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

export default (data: LayoutData): string => {
  const title = data.title ?? "";
  const siteUrl = data.site?.url ?? "";
  const siteName = data.site?.name ?? data.site_name ?? "";
  const pageUrl = data.url ? `${siteUrl}${data.url}` : "";
  const content = data.content ?? "";
  const hasContentH1 = /<h1[\s>]/i.test(content);
  const headerMarkup = hasContentH1 ? "" : `<header>
          <h1 id="page-title" itemprop="headline">${title}</h1>
        </header>`;
  const articleAriaLabel = title
    ? ` aria-label="${escapeAttribute(title)}"`
    : "";
  const articleLabel = hasContentH1
    ? articleAriaLabel
    : ' aria-labelledby="page-title"';
  const metaDescription = buildMetaDescription(data, content);
  const keywords = Array.isArray(data.keywords)
    ? data.keywords.join(", ")
    : data.keywords ?? "";
  const resolvedImage = data.image ? resolveUrl(data.image, siteUrl) : "";
  const authorName = data.author?.name ?? "";
  const authorUrl = data.author?.url ?? "";
  const articleType = data.article_type ?? "Article";
  const twitterCard = data.twitter_card ??
    (resolvedImage ? "summary_large_image" : "summary");
  const jsonld = buildJsonLd(data, metaDescription, resolvedImage);
  const escapedPageUrl = pageUrl ? escapeAttribute(pageUrl) : "";
  const metaDescriptionMarkup = metaDescription
    ? `<meta name="description" content="${
      escapeAttribute(metaDescription)
    }" />`
    : "";
  const canonicalMarkup = pageUrl
    ? `<link rel="canonical" href="${escapedPageUrl}" />
      <meta itemprop="url" content="${escapedPageUrl}" />`
    : "";
  const shareMarkup = pageUrl
    ? `<meta property="og:type" content="website" />
      <meta property="og:url" content="${escapedPageUrl}" />
      <meta property="og:title" content="${escapeAttribute(title)}" />
      ${
      metaDescription
        ? `<meta property="og:description" content="${
          escapeAttribute(metaDescription)
        }" />`
        : ""
    }
      ${
      siteName
        ? `<meta property="og:site_name" content="${
          escapeAttribute(siteName)
        }" />`
        : ""
    }
      ${
      resolvedImage
        ? `<meta property="og:image" content="${
          escapeAttribute(resolvedImage)
        }" />`
        : ""
    }
      ${
      data.image_alt
        ? `<meta property="og:image:alt" content="${
          escapeAttribute(data.image_alt)
        }" />`
        : ""
    }
      <meta name="twitter:card" content="${escapeAttribute(twitterCard)}" />
      <meta name="twitter:title" content="${escapeAttribute(title)}" />
      ${
      metaDescription
        ? `<meta name="twitter:description" content="${
          escapeAttribute(metaDescription)
        }" />`
        : ""
    }
      ${
      resolvedImage
        ? `<meta name="twitter:image" content="${
          escapeAttribute(resolvedImage)
        }" />`
        : ""
    }
      ${
      data.image_alt
        ? `<meta name="twitter:image:alt" content="${
          escapeAttribute(data.image_alt)
        }" />`
        : ""
    }
      ${
      data.twitter_site
        ? `<meta name="twitter:site" content="${
          escapeAttribute(data.twitter_site)
        }" />`
        : ""
    }
      ${
      data.twitter_creator
        ? `<meta name="twitter:creator" content="${
          escapeAttribute(data.twitter_creator)
        }" />`
        : ""
    }`
    : "";
  const articleMetaMarkup = pageUrl
    ? `<meta itemprop="mainEntityOfPage" content="${escapedPageUrl}" />
        <meta itemprop="url" content="${escapedPageUrl}" />
        <meta itemprop="author" content="${escapeAttribute(authorName)}" />
        ${
      authorUrl
        ? `<meta itemprop="sameAs" content="${escapeAttribute(authorUrl)}" />`
        : ""
    }
        ${
      title
        ? `<meta itemprop="headline" content="${escapeAttribute(title)}" />`
        : ""
    }
        ${
      metaDescription
        ? `<meta itemprop="description" content="${
          escapeAttribute(metaDescription)
        }" />`
        : ""
    }`
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
    ${metaDescriptionMarkup}
    ${
    keywords
      ? `<meta name="keywords" content="${escapeAttribute(keywords)}" />`
      : ""
  }
    ${
    data.robots
      ? `<meta name="robots" content="${escapeAttribute(data.robots)}" />`
      : ""
  }
    ${cogSchemaMarkup}
    <meta itemprop="inLanguage" content="en" />
    ${canonicalMarkup}
    ${shareMarkup}
    ${jsonldMarkup}
  </head>
  <body>
    <a href="#content">Skip to content</a>
    <main id="content" role="main" tabindex="-1">
      <article${articleLabel} itemprop="mainEntity" itemscope itemtype="https://schema.org/${articleType}">
        ${articleMetaMarkup}
        ${headerMarkup}
        ${contentWithListA11y}
      </article>
    </main>
  </body>
</html>`;
};
