import lume from "lume/mod.ts";
import { dirname, fromFileUrl, isAbsolute, join } from "@std/path";
import jsonLd from "lume/plugins/json_ld.ts";
import metas from "lume/plugins/metas.ts";
import robots from "lume/plugins/robots.ts";
import sitemap from "lume/plugins/sitemap.ts";
import vento from "lume/plugins/vento.ts";
import { buildLlmsTxt } from "../exporters/llms.ts";
import { buildMcpBundle } from "../exporters/mcp.ts";
import wikilinks from "../inputs/markdown/wikilinks.ts";
import { buildSiteManifest } from "../manifests/site_manifest.ts";

const getSiteUrl = () =>
  (Deno.env.get("SITE_URL") ?? "https://fold.example").replace(/\/$/, "");

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
  const layoutPath = getLayoutPath();
  const vaultPath = getVaultPath();
  const destPath = getSiteDest();

  const site = lume({
    cwd: workspaceRoot,
    src: vaultPath,
    dest: destPath,
    location: new URL(siteUrl),
  });

  // Register the layout from external location
  site.remoteFile("_includes/layout.tmpl.ts", layoutPath);
  site.data("site", { url: siteUrl, basePath });
  site.data("layout", "layout.tmpl.ts");
  site.use(vento());
  site.use(metas());
  site.use(jsonLd());
  site.use(sitemap());
  site.use(robots());
  site.hooks.markdownIt((md: { use: (plugin: unknown) => unknown }) =>
    md.use(
      wikilinks({
        prefix: basePath,
        suffix: "/",
      }),
    )
  );
  site.process([".html"], async (pages) => {
    const manifest = buildSiteManifest(pages);
    const outputPath = site.dest("site.manifest.json");
    await Deno.writeTextFile(outputPath, JSON.stringify(manifest, null, 2));

    const healthPath = site.dest("healthz");
    await Deno.writeTextFile(healthPath, "ok\n");

    const llmsPath = site.dest("llms.txt");
    const llmsTxt = await buildLlmsTxt(pages, { siteUrl });
    await Deno.writeTextFile(llmsPath, llmsTxt);

    const mcpPath = site.dest("mcp/site.json");
    await Deno.mkdir(dirname(mcpPath), { recursive: true });
    const mcpBundle = await buildMcpBundle(pages, { url: siteUrl });
    await Deno.writeTextFile(mcpPath, JSON.stringify(mcpBundle, null, 2));
  });

  return site;
};

export default createSite();
