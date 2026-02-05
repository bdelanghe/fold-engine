import { assertEquals, assertExists } from "@std/assert";
import {
  canonicalizeJsonLd,
  canonicalizeNodes,
  computeCid,
} from "./canonicalize.ts";

Deno.test("canonicalizeJsonLd - produces deterministic hash", async () => {
  const node = {
    "@id": "https://example.org/test",
    "@type": "Test",
    "title": "Test Node",
    "value": 42,
  };

  const result1 = await canonicalizeJsonLd(node);
  const result2 = await canonicalizeJsonLd(node);

  // Same input should produce same hash
  assertEquals(result1.hash, result2.hash);
  assertExists(result1.canonical);
});

Deno.test("canonicalizeJsonLd - different nodes produce different hashes", async () => {
  const node1 = {
    "@id": "https://example.org/test1",
    "@type": "Test",
    "title": "Test 1",
  };

  const node2 = {
    "@id": "https://example.org/test2",
    "@type": "Test",
    "title": "Test 2",
  };

  const result1 = await canonicalizeJsonLd(node1);
  const result2 = await canonicalizeJsonLd(node2);

  // Different inputs should produce different hashes
  assertEquals(result1.hash === result2.hash, false);
});

Deno.test("canonicalizeJsonLd - key order doesn't matter", async () => {
  const node1 = {
    "@id": "https://example.org/test",
    "title": "Test",
    "@type": "Test",
  };

  const node2 = {
    "@type": "Test",
    "@id": "https://example.org/test",
    "title": "Test",
  };

  const result1 = await canonicalizeJsonLd(node1);
  const result2 = await canonicalizeJsonLd(node2);

  // Same data, different key order = same hash
  assertEquals(result1.hash, result2.hash);
});

Deno.test("canonicalizeNodes - handles multiple nodes", async () => {
  const nodes = [
    {
      "@id": "https://example.org/test1",
      "@type": "Test",
      "title": "Test 1",
    },
    {
      "@id": "https://example.org/test2",
      "@type": "Test",
      "title": "Test 2",
    },
  ];

  const results = await canonicalizeNodes(nodes);

  assertEquals(results.length, 2);
  assertExists(results[0].hash);
  assertExists(results[1].hash);
  assertEquals(results[0].hash === results[1].hash, false);
});

Deno.test("computeCid - generates IPFS-style CID", async () => {
  const node = {
    "@id": "https://example.org/test",
    "@type": "Test",
  };

  const canonical = await canonicalizeJsonLd(node);
  const cid = computeCid(canonical);

  assertExists(cid);
  assertEquals(cid.startsWith("ipfs://sha256-"), true);
  // Should be sha256-<64 hex chars>
  assertEquals(cid.length, 78); // "ipfs://sha256-" (14) + 64 hex chars
});

Deno.test("canonicalizeJsonLd - handles arrays deterministically", async () => {
  const node = {
    "@id": "https://example.org/test",
    "items": [3, 1, 2],
  };

  const result1 = await canonicalizeJsonLd(node);
  const result2 = await canonicalizeJsonLd(node);

  assertEquals(result1.hash, result2.hash);
});

Deno.test("canonicalizeJsonLd - handles nested objects", async () => {
  const node = {
    "@id": "https://example.org/test",
    "nested": {
      "inner": {
        "value": 42,
      },
    },
  };

  const result = await canonicalizeJsonLd(node);

  assertExists(result.hash);
  assertExists(result.canonical);
});
