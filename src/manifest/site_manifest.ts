import type { Page } from "lume/core/file.ts";

type ManifestPage = {
  url: string;
  title: string;
  h1: string;
  canonical: string;
  links: string[];
  jsonLd: unknown[];
  forbidden: {
    lumeLiveReload: boolean;
    lumeBar: boolean;
  };
};

export type SiteManifest = {
  generatedAt: string;
  pages: ManifestPage[];
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

export const buildSiteManifest = (pages: Page[]): SiteManifest => {
  const manifestPages: ManifestPage[] = pages.map((page) => {
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

    return {
      url: page.data.url,
      title,
      h1,
      canonical,
      links,
      jsonLd,
      forbidden,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    pages: manifestPages,
  };
};
