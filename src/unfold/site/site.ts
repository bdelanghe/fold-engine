import lume from "lume/mod.ts";
import { fromFileUrl } from "@std/path";
import jsonLd from "lume/plugins/json_ld.ts";
import metas from "lume/plugins/metas.ts";
import robots from "lume/plugins/robots.ts";
import sitemap from "lume/plugins/sitemap.ts";
import vento from "lume/plugins/vento.ts";
import wikilinks from "../inputs/markdown/wikilinks.ts";
import { buildSiteManifest } from "../manifests/site_manifest.ts";

const getSiteUrl = () =>
  (Deno.env.get("SITE_URL") ?? "https://fold.example").replace(/\/$/, "");

const getWorkspaceRoot = () =>
  fromFileUrl(new URL("../../..", import.meta.url));

export const createSite = () => {
  const siteUrl = getSiteUrl();
  const workspaceRoot = getWorkspaceRoot();

  const site = lume({
    cwd: workspaceRoot,
    src: "obsidian_vault",
    dest: "dist/site",
    includes: "_includes",
    location: new URL(siteUrl),
  });

  site.data("layout", "layout.tmpl.ts");
  site.use(vento());
  site.use(metas());
  site.use(jsonLd());
  site.use(sitemap());
  site.use(robots());
  site.hooks.markdownIt((md: { use: (plugin: unknown) => unknown }) =>
    md.use(
      wikilinks({
        prefix: "/",
        suffix: "/",
      }),
    )
  );
  site.process([".html"], async (pages) => {
    const manifest = buildSiteManifest(pages);
    const outputPath = site.dest("site.manifest.json");
    await Deno.writeTextFile(outputPath, JSON.stringify(manifest, null, 2));
  });

  return site;
};

export default createSite();
