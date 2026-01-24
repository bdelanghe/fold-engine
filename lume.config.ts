import lume from "https://deno.land/x/lume/mod.ts";

const site = lume({
  src: "./notes",
  dest: "./_site",
});

export default site;
