import lume from "https://deno.land/x/lume/mod.ts";

const site = lume({
  src: "./src",
  dest: "./_site",
});

export default site;
