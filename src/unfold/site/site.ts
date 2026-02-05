import lume from "lume/mod.ts";
import { dirname, fromFileUrl, isAbsolute, join } from "@std/path";
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

const getSiteUrl = (): string => siteBuildConfig.siteUrl;

const getSiteBasePath = () => {
  const pathname = new URL(getSiteUrl()).pathname.replace(/\/$/, "");
  return pathname ? `${pathname}/` : "/";
};

const getWorkspaceRoot = (): string => {
  const raw = Deno.env.get("WORKSPACE_ROOT")?.trim();
  if (!raw) {
    throw new Error("WORKSPACE_ROOT is required.");
  }
  return raw;
};

const getVaultPath = (): string => {
  const override = Deno.env.get("VAULT_PATH")?.trim();
  if (!override) {
    return "obsidian_vault";
  }
  return isAbsolute(override) ? override : join(getWorkspaceRoot(), override);
};

const getSiteDest = (): string =>
  Deno.env.get("SITE_OUTPUT_DIR")?.trim() || ".unfold/site";

export const createSite = (): ReturnType<typeof lume> => {
  const siteUrl = getSiteUrl();
  const basePath = getSiteBasePath();
  const workspaceRoot = getWorkspaceRoot();
  const vaultPath = getVaultPath();
  const destPath = getSiteDest();

  const site = lume({
    cwd: workspaceRoot,
    src: vaultPath,
    dest: destPath,
    location: new URL(siteUrl),
    watcher: {
      debounce: DEFAULT_WATCH_DEBOUNCE_MS,
    },
  });

  // Register JSON-LD loader for page generation
  // The loader itself filters out @context/ and schemas/ files
  site.loadPages([".jsonld"], jsonLdLoader());

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

    const externalLinks = collectExternalLinks(pageList, { siteUrl });
    const externalXmlPath = site.dest("external-links.xml");
    const externalXml = buildExternalLinksXml(externalLinks, { siteUrl });
    await Deno.writeTextFile(externalXmlPath, externalXml);

    const externalHtmlPath = site.dest("external-links/index.html");
    await Deno.mkdir(dirname(externalHtmlPath), { recursive: true });
    const externalHtml = buildExternalLinksHtml(externalLinks, { siteUrl });
    await Deno.writeTextFile(externalHtmlPath, externalHtml);

  });

  return site;
};

export default createSite;
