import type { Page } from "lume/core/file.ts";
import { isAbsolute, join } from "@std/path";

type McpSite = {
  url: string;
  name?: string;
};

type McpHeading = {
  level: number;
  text: string;
};

type McpPage = {
  url: string;
  title: string;
  description?: string;
  excerpt: string;
  headings: McpHeading[];
};

export type McpBundle = {
  version: "v1";
  generatedAt: string;
  site: McpSite;
  pages: McpPage[];
};

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

const extractHeadings = (document: Document | null): McpHeading[] => {
  if (!document) {
    return [];
  }
  const headings = Array.from(document.querySelectorAll("h1, h2, h3"));
  return headings
    .map((heading) => {
      const level = Number(heading.tagName.replace("H", ""));
      const text = normalizeText(heading.textContent);
      return { level, text };
    })
    .filter((heading) => heading.text);
};

export const buildMcpBundle = async (
  pages: Page[],
  site: McpSite,
): Promise<McpBundle> => {
  const siteUrl = site.url.replace(/\/$/, "");
  const mapped = await Promise.all(
    pages.map(async (page): Promise<McpPage | null> => {
      const url = resolveCanonical(page, siteUrl);
      const title = normalizeText(
        page.document?.querySelector("title")?.textContent,
      );
      const description = normalizeText(
        page.document?.querySelector('meta[name="description"]')?.getAttribute(
          "content",
        ),
      );
      if (!url || !title) {
        return null;
      }
      const excerpt = await readMarkdownExcerpt(page, 240);
      const entry: McpPage = {
        url,
        title,
        excerpt,
        headings: extractHeadings(page.document ?? null),
      };
      if (description) {
        entry.description = description;
      }
      return entry;
    }),
  );
  const pagesWithContent = mapped.filter((page): page is McpPage =>
    page !== null
  );

  pagesWithContent.sort((a, b) => a.url.localeCompare(b.url));

  return {
    version: "v1",
    generatedAt: new Date().toISOString(),
    site: {
      url: siteUrl,
      name: site.name,
    },
    pages: pagesWithContent,
  };
};
