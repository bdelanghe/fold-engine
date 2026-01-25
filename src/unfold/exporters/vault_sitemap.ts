import { fromFileUrl, join } from "@std/path";
import { loadVaultRoot } from "../inputs/vault/load_vault.ts";
import { normalizeSiteUrl } from "../site/site_url.ts";

type SitemapEntry = {
  url: string;
  lastmod: string;
};

const getSiteOutputDir = (): string =>
  Deno.env.get("SITE_OUTPUT_DIR")?.trim() || ".unfold/site";

const getSiteUrl = (): string =>
  normalizeSiteUrl(Deno.env.get("SITE_URL") ?? "https://fold.example");

const stripLegacyFoldEnginePrefix = (pathname: string): string =>
  pathname.replace(/^\/fold-engine(?=\/|$)/, "");

const normalizeEntryUrl = (entryUrl: string, siteUrl: string): string => {
  try {
    const parsed = new URL(entryUrl);
    const normalizedPath = stripLegacyFoldEnginePrefix(parsed.pathname);
    const normalizedUrl = new URL(
      `${normalizedPath}${parsed.search}${parsed.hash}`,
      siteUrl,
    );
    return normalizedUrl.toString();
  } catch {
    return entryUrl;
  }
};

const getAnchorLabel = (entryUrl: string): string => {
  try {
    const parsed = new URL(entryUrl);
    const trimmedPath = parsed.pathname.replace(/\/$/, "");
    if (!trimmedPath) {
      return "fold-engine";
    }
    const segments = trimmedPath.split("/").filter(Boolean);
    return segments[segments.length - 1] ?? parsed.hostname;
  } catch {
    return entryUrl;
  }
};

const parseSitemapXml = (xml: string): SitemapEntry[] => {
  const entries: SitemapEntry[] = [];
  const urlBlocks = xml.matchAll(/<url\b[^>]*>[\s\S]*?<\/url>/gi);
  for (const match of urlBlocks) {
    const block = match[0];
    const locMatch = block.match(
      /<(?:\w+:)?loc>([\s\S]*?)<\/(?:\w+:)?loc>/i,
    );
    const lastmodMatch = block.match(
      /<(?:\w+:)?lastmod>([\s\S]*?)<\/(?:\w+:)?lastmod>/i,
    );
    if (!locMatch || !lastmodMatch) {
      continue;
    }
    const url = locMatch[1]?.trim() ?? "";
    const lastmod = lastmodMatch[1]?.trim() ?? "";
    if (!url || !lastmod) {
      continue;
    }
    entries.push({ url, lastmod });
  }
  return entries;
};

const buildSitemapTableRows = (
  entries: SitemapEntry[],
  siteUrl: string,
): string[] =>
  entries.map(({ url, lastmod }) => {
    const normalized = normalizeEntryUrl(url, siteUrl);
    const anchor = getAnchorLabel(normalized);
    return `| [${anchor}](${normalized}) | ${lastmod} |`;
  });

const updateSitemapTable = (content: string, rows: string[]): string => {
  const lines = content.split(/\r?\n/);
  const header = "| Page | Last modified |";
  const divider = "| --- | --- |";
  const headerIndex = lines.findIndex((line) => line.trim() === header);

  if (headerIndex === -1) {
    const trimmed = content.trimEnd();
    if (!trimmed) {
      return [header, divider, ...rows, ""].join("\n");
    }
    return [trimmed, "", header, divider, ...rows, ""].join("\n");
  }

  const dividerIndex = headerIndex + 1;
  const startIndex = dividerIndex + 1;
  let endIndex = startIndex;
  while (endIndex < lines.length && lines[endIndex].trim().startsWith("|")) {
    endIndex += 1;
  }
  const before = lines.slice(0, startIndex);
  const after = lines.slice(endIndex);
  return [...before, ...rows, ...after].join("\n");
};

export const updateVaultSitemap = async (): Promise<void> => {
  const siteUrl = getSiteUrl();
  const sitemapPath = join(getSiteOutputDir(), "sitemap.xml");
  const vaultRoot = fromFileUrl(loadVaultRoot()).replace(/\/$/, "");
  const outputPath = join(vaultRoot, "sitemap.md");

  const xml = await Deno.readTextFile(sitemapPath);
  const entries = parseSitemapXml(xml);
  const rows = buildSitemapTableRows(entries, siteUrl);
  const existing = await Deno.readTextFile(outputPath).catch(() => "");
  const updated = updateSitemapTable(existing, rows);
  await Deno.writeTextFile(outputPath, updated);
};
