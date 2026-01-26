import { assert } from "@std/assert";
import { loadJsonLdFile } from "../inputs/jsonld/loader.ts";
import { loadShapes } from "./loader.ts";
import { validateNodesWithShapes } from "./validator.ts";

Deno.test("website graph fixture passes SHACL shapes", async () => {
  const fixturePath = new URL(
    "../contracts/about.fixture.jsonld",
    import.meta.url,
  ).pathname;
  const readStatus = await Deno.permissions.query({
    name: "read",
    path: fixturePath,
  });
  if (readStatus.state !== "granted") {
    console.warn("Skipping SHACL fixture test (missing read permission).");
    return;
  }
  const nodes = await loadJsonLdFile(fixturePath);
  const shapes = await loadShapes();
  const report = validateNodesWithShapes(nodes, shapes.shapes);
  assert(report.ok, report.violations.map((v) => v.message).join("\n"));
});
