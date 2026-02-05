import lume from "lume/mod.ts";
import type { Page } from "lume/core/file.ts";
import { dirname, fromFileUrl, isAbsolute, join, relative } from "@std/path";
import jsonLd from "lume/plugins/json_ld.ts";
import metas from "lume/plugins/metas.ts";
import robots from "lume/plugins/robots.ts";
import sitemap from "lume/plugins/sitemap.ts";
import vento from "lume/plugins/vento.ts";
import jsonLdLoader from "../renderers/lume/jsonld_loader.ts";
import {
  buildExternalLinksHtml,
  buildExternalLinksXml,
  collectExternalLinks,
} from "../exporters/external_links.ts";
import { buildLlmsTxt } from "../exporters/llms.ts";
import { buildMcpBundle } from "../exporters/mcp.ts";
import { buildSiteManifest } from "../manifests/site_manifest.ts";
import { siteBuildConfig } from "./site_build_config.ts";
import { vaultConfig } from "../inputs/vault/vault_config.ts";
const DEFAULT_WATCH_DEBOUNCE_MS = 5000;

const normalizePages = (pages: Page[] | Iterable<Page>): Page[] =>
  Array.isArray(pages) ? pages : Array.from(pages);

const normalizeJsonldPath = (url: string): string => {
  const noFragment = url.split("#")[0];
  const noQuery = noFragment.split("?")[0];
  const trimmed = noQuery.replace(/^\/+/, "").replace(/\/$/, "");
  if (!trimmed) {
    return "index";
  }
  return trimmed.endsWith(".html") ? trimmed.slice(0, -5) : trimmed;
};

const writeJsonldPages = async (
  site: ReturnType<typeof lume>,
  pages: Page[],
): Promise<void> => {
  for (const page of pages) {
    const url = page.data?.url;
    const rawJsonld = page.data?.jsonld;
    if (typeof url !== "string" || !rawJsonld) {
      continue;
    }
    const relPath = normalizeJsonldPath(url);
    const outputPath = site.dest(join("jsonld", `${relPath}.jsonld`));
    await Deno.mkdir(dirname(outputPath), { recursive: true });
    const jsonld =
      typeof rawJsonld === "string" ? JSON.parse(rawJsonld) : rawJsonld;
    await Deno.writeTextFile(outputPath, JSON.stringify(jsonld, null, 2));
  }
};

const getSiteUrl = (): string => siteBuildConfig.siteUrl;

const getSiteBasePath = () => {
  const pathname = new URL(getSiteUrl()).pathname.replace(/\/$/, "");
  return pathname ? `${pathname}/` : "/";
};

const getWorkspaceRoot = () =>
  fromFileUrl(new URL("../../..", import.meta.url));

const getLayoutPath = () =>
  fromFileUrl(new URL("../renderers/lume/layout.tmpl.ts", import.meta.url));

const getVaultPath = (): string => {
  const override = Deno.env.get("VAULT_PATH")?.trim();
  if (!override) {
    const workspaceRoot = getWorkspaceRoot().replace(/\/$/, "");
    const resolved = vaultConfig.vaultPath;
    if (isAbsolute(resolved) && resolved.startsWith(`${workspaceRoot}/`)) {
      return relative(workspaceRoot, resolved);
    }
    return resolved;
  }
  if (isAbsolute(override)) {
    const workspaceRoot = getWorkspaceRoot().replace(/\/$/, "");
    if (override.startsWith(`${workspaceRoot}/`)) {
      return relative(workspaceRoot, override);
    }
    return override;
  }
  return override;
};

const getSiteDest = (): string =>
  Deno.env.get("SITE_OUTPUT_DIR")?.trim() || ".unfold/site";

export const createSite = (): ReturnType<typeof lume> => {
  const siteUrl = getSiteUrl();
  const basePath = getSiteBasePath();
  const workspaceRoot = getWorkspaceRoot();
  const vaultPath = getVaultPath();
  const layoutPath = getLayoutPath();
  const normalizedWorkspaceRoot = workspaceRoot.replace(/\/$/, "");
  const srcPath = vaultPath.startsWith(`${normalizedWorkspaceRoot}/`)
    ? relative(normalizedWorkspaceRoot, vaultPath)
    : vaultPath;
  const destPath = getSiteDest();
  const srcRoot = isAbsolute(srcPath) ? srcPath : join(workspaceRoot, srcPath);
  const includesDir = join(srcRoot, "_includes");
  const layoutTarget = join(includesDir, "layout.tmpl.ts");
  try {
    Deno.statSync(layoutTarget);
  } catch {
    Deno.mkdirSync(includesDir, { recursive: true });
    try {
      Deno.copyFileSync(layoutPath, layoutTarget);
    } catch (error) {
      if (!(error instanceof Deno.errors.AlreadyExists)) {
        throw error;
      }
    }
  }

  const site = lume({
    cwd: workspaceRoot,
    src: srcPath,
    dest: destPath,
    location: new URL(siteUrl),
    watcher: {
      debounce: DEFAULT_WATCH_DEBOUNCE_MS,
    },
  });
  site.loadPages([".jsonld"], jsonLdLoader());
  site.data("layout", "layout.tmpl.ts");

  const ignorePrefixes = [
    ".cursor/",
    ".devcontainer/",
    ".git/",
    ".github/",
    ".unfold/",
    ".vscode/",
    "dist/",
    "node_modules/",
    "src/",
    "src/unfold/vault_api/support/",
    "vendor/",
  ];
  if (srcPath.replace(/\/$/, "") === "vault") {
    ignorePrefixes.push("vault/vault/");
  }
  const ignoreFiles = new Set([
    ".cursorindexingignore",
    ".dockerignore",
    ".gitignore",
    ".nojekyll",
    "deno.json",
    "deno.lock",
    "docker-bake.hcl",
    "docker-compose.yml",
    "Dockerfile",
  ]);
  const normalizePath = (value: string) => value.replaceAll("\\", "/");
  const stripWorkspace = (value: string) => {
    const normalized = normalizePath(value);
    if (normalized.startsWith(`${workspaceRoot}/`)) {
      return normalized.slice(workspaceRoot.length + 1);
    }
    if (normalized.startsWith(workspaceRoot)) {
      return normalized.slice(workspaceRoot.length).replace(/^\/+/, "");
    }
    return normalized.replace(/^\/+/, "");
  };
  const ignoreFilter = (path: string) => {
    const relativePath = stripWorkspace(path);
    return (
      ignoreFiles.has(relativePath) ||
      ignorePrefixes.some((prefix) => relativePath.startsWith(prefix))
    );
  };
  const ignore = (
    site as {
      ignore?: (...paths: (string | ((path: string) => boolean))[]) => void;
    }
  ).ignore;
  if (typeof ignore === "function") {
    ignore.call(site, ignoreFilter);
  }

  site.data("site", { url: siteUrl, basePath });
  site.use(vento());
  site.use(metas());
  site.use(jsonLd());
  site.use(sitemap());
  site.use(robots());

  // Process generated HTML pages
  site.process([".html"], async (pages) => {
    const pageList = normalizePages(pages as Page[] | Iterable<Page>);
    await writeJsonldPages(site, pageList);

    const manifest = await buildSiteManifest(pageList);
    const outputPath = site.dest("site.manifest.json");
    await Deno.writeTextFile(outputPath, JSON.stringify(manifest, null, 2));

    const healthPath = site.dest("healthz");
    await Deno.writeTextFile(healthPath, "ok\n");

    const llmsPath = site.dest("llms.txt");
    const llmsTxt = await buildLlmsTxt(pageList, { siteUrl });
    await Deno.writeTextFile(llmsPath, llmsTxt);

    const mcpPath = site.dest("mcp/site.json");
    await Deno.mkdir(dirname(mcpPath), { recursive: true });
    const mcpBundle = await buildMcpBundle(pageList, { url: siteUrl });
    await Deno.writeTextFile(mcpPath, JSON.stringify(mcpBundle, null, 2));

    const hasRootPage = pageList.some((page) => page.data.url === "/");
    if (!hasRootPage) {
      const sortedPages = [...pageList].sort((a, b) =>
        a.data.url.localeCompare(b.data.url)
      );
      const fallbackTarget = sortedPages[0]?.data.url ?? basePath;
      const indexPath = site.dest("index.html");
      try {
        await Deno.stat(indexPath);
      } catch {
        const target = fallbackTarget.startsWith("/") ? fallbackTarget : "/";
        const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="refresh" content="0; url=${target}">
    <title>Fold Engine</title>
    <link rel="canonical" href="${target}">
  </head>
  <body>
    <p>Index not built. Continue to <a href="${target}">${target}</a>.</p>
  </body>
</html>
`;
        await Deno.writeTextFile(indexPath, html);
      }
    }
  });

  return site;
};

export default createSite;
