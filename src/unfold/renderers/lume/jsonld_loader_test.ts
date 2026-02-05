import { assertEquals, assertExists } from "@std/assert";
import jsonldLoader from "./jsonld_loader.ts";

Deno.test("jsonldLoader - loads page data from JSON-LD", async () => {
  const loader = jsonldLoader();
  const data = await loader("example-vault/pages/hello.jsonld");

  assertExists(data);
  assertEquals(data.title, "Hello World");
  assertEquals(data.url, "/pages/hello");
  assertExists(data.jsonld);
  assertExists(data.content);
});

Deno.test("jsonldLoader - extracts URL from @id", async () => {
  const loader = jsonldLoader();
  const data = await loader("example-vault/pages/cognitive-folding.jsonld");

  assertEquals(data.url, "/pages/cognitive-folding");
});

Deno.test("jsonldLoader - handles @graph documents", async () => {
  const loader = jsonldLoader();
  const data = await loader("example-vault/vocab/basis.jsonld");

  assertExists(data);
  // Should pick first node from @graph
  assertEquals(data.url, "/vocab/basis#Fold");
  assertEquals(data.title, "Fold");
});

Deno.test("jsonldLoader - extracts content from hasPart", async () => {
  const loader = jsonldLoader();
  const data = await loader("example-vault/pages/hello.jsonld");

  assertExists(data.content);
  // Should have sections from hasPart
  const content = String(data.content);
  assertEquals(content.includes("Introduction"), true);
});
