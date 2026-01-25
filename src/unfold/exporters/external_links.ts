import type { Page } from "lume/core/file.ts";

type ExternalLinksOptions = {
  siteUrl: string;
  generatedAt?: string;
};

type ExternalLinkEntry = {
  href: string;
  sources: string[];
};

const normalizeUrl = (value: URL): string => {
  value.hash = "";
  return value.toString();
};

const resolvePageUrl = (page: Page, siteUrl: string): string => {
  const canonical =
    page.document?.querySelector('link[rel="canonical"]')?.getAttribute(
      "href",
    ) ?? "";
  if (canonical) {
    try {
      return new URL(canonical, siteUrl).toString();
    } catch {
      return canonical;
    }
  }
  const pageUrl = typeof page.data?.url === "string" ? page.data.url : "";
  if (!pageUrl) {
    return "";
  }
  try {
    return new URL(pageUrl, siteUrl).toString();
  } catch {
    return pageUrl;
  }
};

const isSkippableHref = (href: string): boolean =>
  href.startsWith("#") ||
  href.startsWith("mailto:") ||
  href.startsWith("tel:") ||
  href.startsWith("javascript:");

export const collectExternalLinks = (
  pages: Page[],
  options: ExternalLinksOptions,
): ExternalLinkEntry[] => {
  const siteOrigin = new URL(options.siteUrl).origin;
  const linkMap = new Map<string, Set<string>>();

  for (const page of pages) {
    const pageUrl = resolvePageUrl(page, options.siteUrl);
    if (!pageUrl) {
      continue;
    }
    const anchors = Array.from(page.document?.querySelectorAll("a[href]") ?? []);
    for (const anchor of anchors) {
      const href = anchor.getAttribute("href")?.trim() ?? "";
      if (!href || isSkippableHref(href)) {
        continue;
      }
      try {
        const url = new URL(href, pageUrl);
        if (url.origin === siteOrigin) {
          continue;
        }
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          continue;
        }
        const normalized = normalizeUrl(url);
        const sources = linkMap.get(normalized) ?? new Set<string>();
        sources.add(pageUrl);
        linkMap.set(normalized, sources);
      } catch {
        continue;
      }
    }
  }

  const entries = Array.from(linkMap.entries()).map(([href, sources]) => ({
    href,
    sources: Array.from(sources).sort(),
  }));
  entries.sort((a, b) => a.href.localeCompare(b.href));
  return entries;
};

export const buildExternalLinksXml = (
  entries: ExternalLinkEntry[],
  options: ExternalLinksOptions,
): string => {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const siteUrl = options.siteUrl.replace(/\/$/, "");
  const lines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<externalLinks generated="${generatedAt}" site="${siteUrl}">`,
  ];
  for (const entry of entries) {
    lines.push(`  <link href="${entry.href}">`);
    for (const source of entry.sources) {
      lines.push(`    <source url="${source}" />`);
    }
    lines.push(`  </link>`);
  }
  lines.push(`</externalLinks>`);
  return `${lines.join("\n")}\n`;
};

export const buildExternalLinksHtml = (
  entries: ExternalLinkEntry[],
  options: ExternalLinksOptions,
): string => {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const siteUrl = options.siteUrl.replace(/\/$/, "");
  const listItems = entries.map((entry) => {
    const sourceItems = entry.sources
      .map((source) =>
        `<li><a href="${source}">${source}</a></li>`
      )
      .join("");
    return `<li>
  <a href="${entry.href}">${entry.href}</a>
  <ul>
    ${sourceItems}
  </ul>
</li>`;
  }).join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>External Links</title>
    <link rel="canonical" href="${siteUrl}/external-links/" />
  </head>
  <body>
    <main>
      <header>
        <h1>External Links</h1>
        <p>Generated ${generatedAt}</p>
        <p>Total links: ${entries.length}</p>
      </header>
      <ol>
        ${listItems}
      </ol>
    </main>
  </body>
</html>
`;
};
