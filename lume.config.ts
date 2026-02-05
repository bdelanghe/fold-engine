import lume from "lume/mod.ts";
import { fromFileUrl } from "@std/path";
import jsonLd from "lume/plugins/json_ld.ts";
import metas from "lume/plugins/metas.ts";
import robots from "lume/plugins/robots.ts";
import sitemap from "lume/plugins/sitemap.ts";
import vento from "lume/plugins/vento.ts";
import wikilinks from "./src/unfold/inputs/markdown/wikilinks.ts";
import { buildSiteManifest } from "./src/unfold/manifests/site_manifest.ts";

const siteUrl = (Deno.env.get("SITE_URL") ?? "https://fold.example").replace(
  /\/$/,
  "",
);

const siteRoot = fromFileUrl(new URL(".", import.meta.url));

const site = lume({
  cwd: siteRoot,
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
export default site;
