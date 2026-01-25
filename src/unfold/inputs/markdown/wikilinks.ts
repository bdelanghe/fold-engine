type WikiLinkOptions = {
  prefix?: string;
  suffix?: string;
  sitemap?: Map<string, string> | Record<string, string>;
};

type WikiLinkToken = {
  type: string;
  tag: string;
  nesting: number;
  content: string;
  meta?: {
    target: string;
  };
};

type WikiLinkState = {
  pos: number;
  src: string;
  push: (type: string, tag: string, nesting: number) => WikiLinkToken;
};

type MarkdownIt = {
  inline: {
    ruler: {
      before: (
        ruleName: string,
        name: string,
        fn: (state: WikiLinkState, silent: boolean) => boolean,
      ) => void;
    };
  };
  renderer: {
    rules: Record<string, (tokens: WikiLinkToken[], idx: number) => string>;
  };
  utils: {
    escapeHtml: (value: string) => string;
  };
};

const slugify = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const withoutExt = trimmed.replace(/\.md$/i, "");
  return withoutExt
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/\/+/g, "/")
    .replace(/(^-|-$)/g, "");
};

export const normalizeWikiTarget = (target: string): string =>
  target
    .split("/")
    .map((segment) => slugify(segment))
    .filter((segment) => segment.length > 0)
    .join("/");

const resolveSitemapHref = (
  target: string,
  sitemap?: Map<string, string> | Record<string, string>,
): string | null => {
  if (!sitemap) return null;
  if (sitemap instanceof Map) {
    return sitemap.get(target) ?? null;
  }
  return sitemap[target] ?? null;
};

const normalizeSitemapHref = (pathname: string): string => {
  const trimmed = pathname.trim();
  if (!trimmed || trimmed === "/") {
    return "/";
  }
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
};

export const buildSitemapLinkMap = (xml: string): Map<string, string> => {
  const map = new Map<string, string>();
  const locPattern = /<(?:\w+:)?loc>([^<]+)<\/(?:\w+:)?loc>/gi;
  for (const match of xml.matchAll(locPattern)) {
    const rawHref = match[1]?.trim() ?? "";
    if (!rawHref) continue;

    let pathname = rawHref;
    try {
      const parsed = new URL(rawHref);
      pathname = parsed.pathname || "/";
    } catch {
      pathname = rawHref.split(/[?#]/)[0] ?? rawHref;
    }

    const trimmedPath = pathname.replace(/^\/+|\/+$/g, "");
    if (!trimmedPath) {
      map.set("fold-engine", "/");
      continue;
    }
    const normalizedKey = normalizeWikiTarget(trimmedPath);
    if (!normalizedKey) continue;

    map.set(normalizedKey, normalizeSitemapHref(pathname));
  }
  return map;
};

export const buildWikiHref = (
  target: string,
  options: WikiLinkOptions = {},
): string => {
  const normalizedTarget = normalizeWikiTarget(target);
  const sitemapHref = resolveSitemapHref(normalizedTarget, options.sitemap);
  if (sitemapHref) {
    return sitemapHref;
  }
  const rawPrefix = options.prefix ?? "/";
  const normalizedPrefix = rawPrefix.replace(/^\/fold-engine(?=\/|$)/, "");
  const prefix = normalizedPrefix || "/";
  const suffix = options.suffix ?? "/";
  const encodedTarget = normalizedTarget
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${prefix}${encodedTarget}${suffix}`;
};

export default function wikiLinks(
  options: WikiLinkOptions = {},
): (md: MarkdownIt) => void {
  return (md: MarkdownIt) => {
    md.inline.ruler.before("emphasis", "wikilink", (state, silent) => {
      const start = state.pos;
      const src = state.src;

      if (src.charCodeAt(start) !== 0x5b /* [ */) return false;
      if (src.charCodeAt(start + 1) !== 0x5b /* [ */) return false;

      const end = src.indexOf("]]", start + 2);
      if (end === -1) return false;

      if (!silent) {
        const raw = src.slice(start + 2, end).trim();
        if (!raw) return false;

        const [targetRaw, labelRaw] = raw.split("|");
        const target = (targetRaw ?? "").trim();
        const label = (labelRaw ?? target).trim();

        if (!target) return false;

        const token = state.push("wikilink", "", 0) as WikiLinkToken;
        token.content = label;
        token.meta = { target };
      }

      state.pos = end + 2;
      return true;
    });

    md.renderer.rules.wikilink = (tokens, idx) => {
      const token = tokens[idx];
      const target = token.meta?.target ?? token.content;
      const label = token.content;
      const href = buildWikiHref(target, options);
      const safeHref = md.utils.escapeHtml(href);
      const safeLabel = md.utils.escapeHtml(label);

      return `<a href="${safeHref}">${safeLabel}</a>`;
    };
  };
}
