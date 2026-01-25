import { DOMParser, type HTMLDocument } from "deno-dom-wasm";
import { normalizeSiteUrl } from "./site_url.ts";

type ManifestPage = {
  path: string;
  title: string;
  h1: string;
  links: string[];
  hasJsonLd: boolean;
  jsonLdErrors: string[];
  canonical: string;
  hasCharset: boolean;
  hasViewport: boolean;
  forbiddenMarkersFound: string[];
};

export type SiteManifest = {
  site: {
    url: string;
    buildMode: string;
  };
  pages: ManifestPage[];
};

type ManifestOptions = {
  siteDir?: string;
  siteUrl?: string;
  buildMode?: string;
};

const defaultSiteUrl = () =>
  normalizeSiteUrl(Deno.env.get("SITE_URL") ?? "https://fold.example");

const defaultBuildMode = () =>
  Deno.env.get("LUME_ENV") ?? Deno.env.get("BUILD_MODE") ?? "production";

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

const getCanonicalUrl = (doc: HTMLDocument, siteUrl: string): string => {
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
  doc: HTMLDocument,
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

const extractJsonLd = (doc: HTMLDocument): {
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

const getSiteDir = (): string =>
  Deno.env.get("SITE_OUTPUT_DIR")?.trim() || ".unfold/site";

export const generateSiteManifest = async (
  options: ManifestOptions = {},
): Promise<SiteManifest> => {
  const siteDir = options.siteDir ?? getSiteDir();
  const siteUrl = (options.siteUrl ?? defaultSiteUrl()).replace(/\/$/, "");
  const buildMode = options.buildMode ?? defaultBuildMode();
  const htmlFiles = await collectHtmlFiles(siteDir);

  const pages = await Promise.all(
    htmlFiles.map(async (filePath) => {
      const html = await Deno.readTextFile(filePath);
      const doc = new DOMParser().parseFromString(html, "text/html");
      if (!doc) {
        throw new Error(`Failed to parse HTML for ${filePath}`);
      }

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

      return {
        path,
        title,
        h1,
        links: extractLinks(doc, pageUrl, siteUrl),
        hasJsonLd,
        jsonLdErrors,
        canonical,
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
