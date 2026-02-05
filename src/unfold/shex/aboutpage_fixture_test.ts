import { assert } from "@std/assert";
import { loadJsonLdFile } from "../inputs/jsonld/loader.ts";
import { validateNodesWithShex } from "./validator.ts";

Deno.test("about fixture passes ShEx shapes", async () => {
  const fixturePath = new URL(
    "../contracts/about.fixture.jsonld",
    import.meta.url,
  ).pathname;
  const shexPath = new URL("./aboutpage.shexj.json", import.meta.url).pathname;
  const nodes = await loadJsonLdFile(fixturePath);
  const schema = JSON.parse(await Deno.readTextFile(shexPath));
  const report = validateNodesWithShex(nodes, schema);
  assert(report.ok, report.violations.map((v) => v.message).join("\n"));
});
