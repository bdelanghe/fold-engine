import { assertEquals, assertRejects } from "@std/assert";
import { validateNode, validateNodes } from "./validator_zod.ts";
import { ValidationError } from "./types.ts";
import type { VaultNode } from "./types.ts";

Deno.test("validateNode - accepts valid page", async () => {
  const node: VaultNode = {
    "@context": "../@context/default.jsonld",
    "@type": "basis:Page",
    "@id": "https://example.org/pages/test",
    "title": "Test Page",
    "description": "A test page",
    "dateCreated": "2026-01-25",
  };

  // Should not throw
  await validateNode(node);
});

Deno.test("validateNode - rejects page without title", async () => {
  const node: VaultNode = {
    "@type": "basis:Page",
    "@id": "https://example.org/pages/test",
    // Missing title
  };

  await assertRejects(
    () => validateNode(node),
    ValidationError,
    "Required",
  );
});

Deno.test("validateNode - rejects invalid @id pattern", async () => {
  const node: VaultNode = {
    "@type": "basis:Page",
    "@id": "https://example.org/wrong/test", // Should be /pages/
    "title": "Test",
  };

  await assertRejects(
    () => validateNode(node),
    ValidationError,
  );
});

Deno.test("validateNode - accepts valid reference", async () => {
  const node: VaultNode = {
    "@type": "basis:Reference",
    "@id": "https://example.org/refs/test",
    "title": "Test Reference",
    "url": "https://example.com/resource",
  };

  // Should not throw
  await validateNode(node);
});

Deno.test("validateNode - rejects reference without url", async () => {
  const node: VaultNode = {
    "@type": "basis:Reference",
    "@id": "https://example.org/refs/test",
    "title": "Test Reference",
    // Missing url
  };

  await assertRejects(
    () => validateNode(node),
    ValidationError,
    "Required",
  );
});

Deno.test("validateNode - accepts valid concept", async () => {
  const node: VaultNode = {
    "@id": "https://example.org/vocab/basis#Test",
    "@type": "skos:Concept",
    "label": "Test Concept",
    "definition": "A test concept",
  };

  // Should not throw
  await validateNode(node);
});

Deno.test("validateNode - rejects node without @id", async () => {
  const node = {
    "@type": "basis:Page",
    "title": "Test",
    // Missing @id
  } as unknown as VaultNode;

  await assertRejects(
    () => validateNode(node),
    ValidationError,
    "missing required @id",
  );
});

Deno.test("validateNode - allows unknown types", async () => {
  const node: VaultNode = {
    "@id": "https://example.org/unknown",
    "@type": "UnknownType",
    "someProperty": "value",
  };

  // Should not throw - unknown types just need @id
  await validateNode(node);
});

Deno.test("validateNodes - returns all errors", async () => {
  const nodes = [
    {
      "@type": "basis:Page",
      "@id": "https://example.org/pages/good",
      "title": "Good Page",
    },
    {
      "@type": "basis:Page",
      "@id": "https://example.org/pages/bad",
      // Missing title
    },
    {
      "@type": "basis:Reference",
      "@id": "https://example.org/refs/bad",
      "title": "Bad Ref",
      // Missing url
    },
  ] as unknown as VaultNode[];

  const errors = await validateNodes(nodes);

  assertEquals(errors.length, 2);
});
