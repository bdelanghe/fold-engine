import { assertEquals, assertExists } from "@std/assert";
import { loadJsonLdFile, loadVault, extractNodes } from "./loader.ts";
import type { JsonLdDocument } from "./types.ts";

Deno.test("extractNodes - handles single object with @id", () => {
  const doc: JsonLdDocument = {
    "@id": "https://example.org/test",
    "@type": "Test",
    "title": "Test Node",
  };

  const nodes = extractNodes(doc, "test.jsonld");

  assertEquals(nodes.length, 1);
  assertEquals(nodes[0]["@id"], "https://example.org/test");
  assertEquals(nodes[0]._source?.file, "test.jsonld");
});

Deno.test("extractNodes - handles @graph with multiple nodes", () => {
  const doc: JsonLdDocument = {
    "@context": "https://example.org/context",
    "@graph": [
      {
        "@id": "https://example.org/node1",
        "@type": "Test",
      },
      {
        "@id": "https://example.org/node2",
        "@type": "Test",
      },
    ],
  };

  const nodes = extractNodes(doc, "test.jsonld");

  assertEquals(nodes.length, 2);
  assertEquals(nodes[0]["@id"], "https://example.org/node1");
  assertEquals(nodes[1]["@id"], "https://example.org/node2");
});

Deno.test("extractNodes - handles array of nodes", () => {
  const doc = [
    {
      "@id": "https://example.org/node1",
      "@type": "Test",
    },
    {
      "@id": "https://example.org/node2",
      "@type": "Test",
    },
  ] as unknown as JsonLdDocument;

  const nodes = extractNodes(doc, "test.jsonld");

  assertEquals(nodes.length, 2);
});

Deno.test("extractNodes - ignores objects without @id", () => {
  const doc: JsonLdDocument = {
    "title": "No ID",
  };

  const nodes = extractNodes(doc, "test.jsonld");

  assertEquals(nodes.length, 0);
});

Deno.test("loadJsonLdFile - loads hello.jsonld", async () => {
  const nodes = await loadJsonLdFile("vault/pages/hello.jsonld");

  assertExists(nodes);
  assertEquals(nodes.length, 1);
  assertEquals(nodes[0]["@id"], "https://example.org/pages/hello");
  assertEquals(nodes[0]["@type"], "basis:Page");
});

Deno.test("loadJsonLdFile - loads vocab with @graph", async () => {
  const nodes = await loadJsonLdFile("vault/vocab/basis.jsonld");

  assertExists(nodes);
  assertEquals(nodes.length, 3); // Fold, Unfold, Transform
  assertEquals(nodes[0]["@id"], "https://example.org/vocab/basis#Fold");
  assertEquals(nodes[1]["@id"], "https://example.org/vocab/basis#Unfold");
  assertEquals(nodes[2]["@id"], "https://example.org/vocab/basis#Transform");
});

Deno.test("loadVault - loads all files from vault", async () => {
  const { nodes, errors } = await loadVault("vault");

  // Should have loaded all nodes from all files
  assertExists(nodes);
  assertEquals(errors.length, 0, `Unexpected errors: ${errors.map(e => e.message).join(", ")}`);

  // Check we got nodes from different files
  const ids = nodes.map(n => n["@id"]);
  assertEquals(ids.includes("https://example.org/catalog"), true, "Missing catalog");
  assertEquals(ids.includes("https://example.org/pages/hello"), true, "Missing hello page");
  assertEquals(ids.includes("https://example.org/pages/cognitive-folding"), true, "Missing cognitive-folding");
  assertEquals(ids.includes("https://example.org/refs/json-ld-spec"), true, "Missing json-ld-spec ref");
  assertEquals(ids.includes("https://example.org/vocab/basis#Fold"), true, "Missing Fold concept");
});

Deno.test("loadVault - each node has source metadata", async () => {
  const { nodes } = await loadVault("vault");

  for (const node of nodes) {
    assertExists(node._source, `Node ${node["@id"]} missing _source`);
    assertExists(node._source.file, `Node ${node["@id"]} missing _source.file`);
  }
});
