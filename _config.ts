import lume from "https://deno.land/x/lume/mod.ts";
import json from "https://deno.land/x/lume/plugins/json.ts";
import modules from "https://deno.land/x/lume/plugins/modules.ts";
import wikilinks from "./scripts/markdown_wikilinks.ts";

const siteUrl = (Deno.env.get("SITE_URL") ?? "https://fold.example").replace(
  /\/$/,
  "",
);

const site = lume({
  src: "./notes",
  dest: "./_site",
  includes: "notes/_includes",
  location: new URL(siteUrl),
});

site.use(json());
site.use(modules());
site.data("layout", "layout.tmpl.ts");
site.hooks.markdownIt((md: { use: (plugin: unknown) => unknown }) =>
  md.use(
    wikilinks({
      prefix: "/",
      suffix: "/",
    }),
  )
);

export default site;
