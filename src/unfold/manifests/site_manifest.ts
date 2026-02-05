import type { Page } from "lume/core/file.ts";

type ManifestPage = {
  url: string;
  title: string;
  h1: string;
  canonical: string;
  links: string[];
  jsonLd: unknown[];
  cid: string;
  forbidden: {
    lumeLiveReload: boolean;
    lumeBar: boolean;
  };
};

export type SiteManifest = {
  generatedAt: string;
  pages: ManifestPage[];
};

type DomParserConstructor = {
  new (): {
    parseFromString: (html: string, mimeType: string) => Document | null;
  };
};

const getDomParser = async (): Promise<DomParserConstructor> => {
  const existingParser = globalThis.DOMParser;
  if (typeof existingParser !== "undefined") {
    return existingParser as unknown as DomParserConstructor;
  }
  const { DOMParser: DenoDomParser } = await import(
    "deno-dom-wasm"
  );
  return DenoDomParser as unknown as DomParserConstructor;
};

export const parseHtml = async (
  html: string,
  context?: string,
): Promise<Document> => {
  const DomParser = await getDomParser();
  const document = new DomParser().parseFromString(html, "text/html");
  if (!document) {
    const label = context ? ` for ${context}` : "";
    throw new Error(`Failed to parse HTML${label}.`);
  }
  return document;
};

const normalizeText = (value: string | null | undefined): string =>
  (value ?? "").replace(/\s+/g, " ").trim();

const readJsonLd = (value: string): unknown => {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
};

const hashSha256Hex = async (value: string): Promise<string> => {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const buildCid = async (value: string): Promise<string> =>
  `sha256:${await hashSha256Hex(value)}`;

const getPageHtml = (page: Page): string => {
  const documentHtml = page.document?.documentElement?.outerHTML;
  if (typeof documentHtml === "string") {
    return documentHtml;
  }
  return typeof page.content === "string" ? page.content : "";
};

export const buildSiteManifest = async (
  pages: Page[],
): Promise<SiteManifest> => {
  const manifestPages: ManifestPage[] = await Promise.all(pages.map(
    async (page) => {
    const document = page.document;
    const title = normalizeText(document.querySelector("title")?.textContent);
    const h1 = normalizeText(document.querySelector("h1")?.textContent);
    const canonical =
      document.querySelector('link[rel="canonical"]')?.getAttribute("href") ??
        "";
    const links = Array.from(document.querySelectorAll("a[href]"))
      .map((anchor) => anchor.getAttribute("href") ?? "")
      .map((href) => href.trim())
      .filter((href) => href.length > 0);
    const jsonLd = Array.from(
      document.querySelectorAll('script[type="application/ld+json"]'),
    )
      .map((script) => script.textContent ?? "")
      .map(readJsonLd);
    const forbidden = {
      lumeLiveReload:
        document.querySelector("script#lume-live-reload") !== null,
      lumeBar: document.querySelector("lume-bar") !== null,
    };
    const cid = await buildCid(getPageHtml(page));

    return {
      url: page.data.url,
      title,
      h1,
      canonical,
      links,
      jsonLd,
      cid,
      forbidden,
    };
  }));

  return {
    generatedAt: new Date().toISOString(),
    pages: manifestPages,
  };
};

type ContractManifestPage = {
  path: string;
  title: string;
  h1: string;
  links: string[];
  hasJsonLd: boolean;
  jsonLdErrors: string[];
  canonical: string;
  cid: string;
  hasCharset: boolean;
  hasViewport: boolean;
  forbiddenMarkersFound: string[];
};

export type SiteContractManifest = {
  site: {
    url: string;
    buildMode: string;
  };
  pages: ContractManifestPage[];
};

type ManifestOptions = {
  siteDir?: string;
  siteUrl?: string;
  buildMode?: string;
};

const defaultSiteUrl = () =>
  Deno.env.get("SITE_URL")?.trim() ?? "https://fold.example";

const defaultBuildMode = () =>
  Deno.env.get("LUME_ENV") ?? Deno.env.get("BUILD_MODE") ?? "production";

const getSiteDir = (): string =>
  Deno.env.get("SITE_OUTPUT_DIR")?.trim() || ".unfold/site";

const normalizePathname = (pathname: string): string => {
  if (!pathname.startsWith("/")) {
    pathname = `/${pathname}`;
  }

  if (pathname === "/") {
    return pathname;
  }

  if (pathname.endsWith("/index.html")) {
    const trimmed = pathname.slice(0, -"/index.html".length);
    return trimmed === "" ? "/" : `${trimmed}/`;
  }

  if (pathname.endsWith(".html")) {
    return pathname;
  }

  return pathname.endsWith("/") ? pathname : `${pathname}/`;
};

const pathFromHtmlFile = (siteDir: string, filePath: string): string => {
  const normalizedDir = siteDir.replace(/\/$/, "");
  const relative = filePath.slice(normalizedDir.length).replaceAll("\\", "/");
  const pathname = relative.startsWith("/") ? relative : `/${relative}`;
  return normalizePathname(pathname);
};

const collectHtmlFiles = async (dir: string): Promise<string[]> => {
  const htmlFiles: string[] = [];
  for await (const entry of Deno.readDir(dir)) {
    const entryPath = `${dir}/${entry.name}`;
    if (entry.isDirectory) {
      htmlFiles.push(...await collectHtmlFiles(entryPath));
      continue;
    }
    if (entry.isFile && entry.name.endsWith(".html")) {
      htmlFiles.push(entryPath);
    }
  }
  return htmlFiles;
};

const getCanonicalUrl = (doc: Document, siteUrl: string): string => {
  const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute(
    "href",
  ) ?? "";

  if (!canonical) {
    return "";
  }

  try {
    return new URL(canonical, siteUrl).toString();
  } catch {
    return canonical;
  }
};

const extractLinks = (
  doc: Document,
  pageUrl: string,
  siteUrl: string,
): string[] => {
  const links = new Set<string>();
  const anchors = Array.from(doc.querySelectorAll("a[href]"));

  for (const anchor of anchors) {
    const href = anchor.getAttribute("href");
    if (!href) {
      continue;
    }

    if (
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("javascript:")
    ) {
      continue;
    }

    try {
      const url = new URL(href, pageUrl);
      if (url.origin !== new URL(siteUrl).origin) {
        continue;
      }
      links.add(normalizePathname(url.pathname));
    } catch {
      continue;
    }
  }

  return Array.from(links).sort();
};

const extractJsonLd = (doc: Document): {
  hasJsonLd: boolean;
  jsonLdErrors: string[];
} => {
  const scripts = Array.from(
    doc.querySelectorAll('script[type="application/ld+json"]'),
  );
  if (scripts.length === 0) {
    return { hasJsonLd: false, jsonLdErrors: [] };
  }

  const errors: string[] = [];
  for (const script of scripts) {
    const text = script.textContent?.trim() ?? "";
    if (!text) {
      continue;
    }
    try {
      JSON.parse(text);
    } catch (error) {
      errors.push(
        error instanceof Error ? error.message : "Invalid JSON-LD payload",
      );
    }
  }

  return { hasJsonLd: true, jsonLdErrors: errors };
};

const detectForbiddenMarkers = (html: string): string[] => {
  const markers: Array<{ id: string; pattern: RegExp }> = [
    { id: "lume-live-reload", pattern: /lume-live-reload/i },
    { id: "lume-bar", pattern: /<lume-bar/i },
    { id: "data-lume-live-reload", pattern: /data-lume-live-reload/i },
    { id: "ws://", pattern: /ws:\/\//i },
    { id: "wss://", pattern: /wss:\/\//i },
    { id: "data-cursor-", pattern: /data-cursor-/i },
  ];

  return markers
    .filter((marker) => marker.pattern.test(html))
    .map((marker) => marker.id);
};

export const generateSiteManifest = async (
  options: ManifestOptions = {},
): Promise<SiteContractManifest> => {
  const siteDir = options.siteDir ?? getSiteDir();
  const siteUrl = (options.siteUrl ?? defaultSiteUrl()).replace(/\/$/, "");
  const buildMode = options.buildMode ?? defaultBuildMode();
  const htmlFiles = await collectHtmlFiles(siteDir);

  const pages = await Promise.all(
    htmlFiles.map(async (filePath) => {
      const html = await Deno.readTextFile(filePath);
      const doc = await parseHtml(html, filePath);

      const path = pathFromHtmlFile(siteDir, filePath);
      const pageUrl = new URL(path, siteUrl).toString();
      const title = doc.querySelector("title")?.textContent?.trim() ?? "";
      const h1 = doc.querySelector("h1")?.textContent?.trim() ?? "";
      const hasCharset = Boolean(doc.querySelector("meta[charset]"));
      const hasViewport = Boolean(
        doc.querySelector('meta[name="viewport"]'),
      );
      const canonical = getCanonicalUrl(doc, siteUrl);
      const { hasJsonLd, jsonLdErrors } = extractJsonLd(doc);
      const cid = await buildCid(html);

      return {
        path,
        title,
        h1,
        links: extractLinks(doc, pageUrl, siteUrl),
        hasJsonLd,
        jsonLdErrors,
        canonical,
        cid,
        hasCharset,
        hasViewport,
        forbiddenMarkersFound: detectForbiddenMarkers(html),
      };
    }),
  );

  pages.sort((a, b) => a.path.localeCompare(b.path));

  return {
    site: {
      url: siteUrl,
      buildMode,
    },
    pages,
  };
};
