import { assertEquals, assertExists } from "@std/assert";
import { enrichNode, enrichNodes } from "./enrich.ts";
import type { VaultNode } from "../inputs/jsonld/types.ts";

Deno.test("enrichNode - adds basis:cid", async () => {
  const node: VaultNode = {
    "@id": "https://example.org/test",
    "@type": "Test",
    "title": "Test Node",
  };

  const enriched = await enrichNode(node);

  assertExists(enriched["basis:cid"]);
  assertEquals(enriched["basis:cid"]?.startsWith("ipfs://sha256-"), true);
  assertExists(enriched["basis:canonicalHash"]);

  // Original properties preserved
  assertEquals(enriched["@id"], node["@id"]);
  assertEquals(enriched.title, node.title);
});

Deno.test("enrichNode - same content produces same CID", async () => {
  const node1: VaultNode = {
    "@id": "https://example.org/test",
    "title": "Test",
  };

  const node2: VaultNode = {
    "title": "Test",
    "@id": "https://example.org/test",
  };

  const enriched1 = await enrichNode(node1);
  const enriched2 = await enrichNode(node2);

  // Same content, different key order = same CID
  assertEquals(enriched1["basis:cid"], enriched2["basis:cid"]);
});

Deno.test("enrichNode - different content produces different CIDs", async () => {
  const node1: VaultNode = {
    "@id": "https://example.org/test1",
    "title": "Test 1",
  };

  const node2: VaultNode = {
    "@id": "https://example.org/test2",
    "title": "Test 2",
  };

  const enriched1 = await enrichNode(node1);
  const enriched2 = await enrichNode(node2);

  assertEquals(enriched1["basis:cid"] === enriched2["basis:cid"], false);
});

Deno.test("enrichNode - excludes _source from canonicalization", async () => {
  const node: VaultNode = {
    "@id": "https://example.org/test",
    "title": "Test",
    _source: {
      file: "test.jsonld",
      path: "/vault/test.jsonld",
    },
  };

  const enriched = await enrichNode(node);

  // _source should not affect the CID
  const nodeWithoutSource: VaultNode = {
    "@id": "https://example.org/test",
    "title": "Test",
  };

  const enrichedWithoutSource = await enrichNode(nodeWithoutSource);

  assertEquals(enriched["basis:cid"], enrichedWithoutSource["basis:cid"]);
});

Deno.test("enrichNodes - processes multiple nodes", async () => {
  const nodes: VaultNode[] = [
    {
      "@id": "https://example.org/test1",
      "title": "Test 1",
    },
    {
      "@id": "https://example.org/test2",
      "title": "Test 2",
    },
  ];

  const enriched = await enrichNodes(nodes);

  assertEquals(enriched.length, 2);
  assertExists(enriched[0]["basis:cid"]);
  assertExists(enriched[1]["basis:cid"]);
  assertEquals(enriched[0]["basis:cid"] === enriched[1]["basis:cid"], false);
});
