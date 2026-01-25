import type { Page } from "lume/core/file.ts";
import { isAbsolute, join } from "@std/path";

type LlmsOptions = {
  siteUrl: string;
  generatedAt?: string;
};

const ensureTrailingSlash = (value: string): string =>
  value.endsWith("/") ? value : `${value}/`;

const normalizeText = (value: string | null | undefined): string =>
  (value ?? "").replace(/\s+/g, " ").trim();

const stripFrontmatter = (value: string): string =>
  value.replace(/^---\n[\s\S]*?\n---\n/, "");

const stripMarkdown = (value: string): string =>
  value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_~-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const resolveSourcePath = (page: Page): string | null => {
  const path = typeof page.src?.path === "string" ? page.src.path : "";
  if (!path) {
    return null;
  }
  return isAbsolute(path) ? path : join(Deno.cwd(), path);
};

const readMarkdownExcerpt = async (page: Page, maxChars: number) => {
  const sourcePath = resolveSourcePath(page);
  if (!sourcePath || !sourcePath.endsWith(".md")) {
    return "";
  }
  try {
    const raw = await Deno.readTextFile(sourcePath);
    const stripped = stripMarkdown(stripFrontmatter(raw));
    return stripped.slice(0, maxChars);
  } catch {
    return "";
  }
};

const resolveCanonical = (page: Page, siteUrl: string): string => {
  const canonical =
    page.document?.querySelector('link[rel="canonical"]')?.getAttribute(
      "href",
    ) ??
      "";
  if (canonical) {
    return canonical;
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

export const buildLlmsTxt = async (
  pages: Page[],
  options: LlmsOptions,
): Promise<string> => {
  const siteUrl = options.siteUrl.replace(/\/$/, "");
  const generatedAt = options.generatedAt ?? new Date().toISOString();

  const entries = await Promise.all(
    pages.map(async (page) => {
      const url = resolveCanonical(page, siteUrl);
      const title = normalizeText(
        page.document?.querySelector("title")?.textContent,
      );
      if (!url) {
        return null;
      }
      const excerpt = await readMarkdownExcerpt(page, 200);
      return { url, title, excerpt };
    }),
  );
  const validEntries = entries.filter(
    (entry): entry is { url: string; title: string; excerpt: string } =>
      entry !== null,
  );

  validEntries.sort((a, b) => a.url.localeCompare(b.url));

  const uniqueUrls = new Set<string>();
  const lines = [
    "# llms.txt",
    `# site: ${siteUrl}`,
    `# generated: ${generatedAt}`,
    "",
    `allow: ${ensureTrailingSlash(siteUrl)}`,
  ];

  for (const entry of validEntries) {
    if (uniqueUrls.has(entry.url)) {
      continue;
    }
    uniqueUrls.add(entry.url);
    lines.push(`index: ${entry.url}`);
  }

  for (const entry of validEntries) {
    if (entry.title) {
      lines.push(`topic: ${entry.title} | ${entry.url}`);
    }
    if (entry.excerpt) {
      lines.push(`summary: ${entry.excerpt} | ${entry.url}`);
    }
  }

  return `${lines.join("\n")}\n`;
};
