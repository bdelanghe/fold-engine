import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import type { VaultNode } from "./types.ts";
import { validateLinkIntegrity } from "./validator_links.ts";

const nodeSource = (file: string) => ({ file, path: file });

Deno.test("validateLinkIntegrity - rejects duplicate @id", () => {
  const fileA = join("vault", "pages", "a.jsonld");
  const fileB = join("vault", "pages", "b.jsonld");
  const nodes = [
    {
      "@type": "basis:Page",
      "@id": "https://example.org/pages/dup",
      title: "First",
      _source: nodeSource(fileA),
    },
    {
      "@type": "basis:Page",
      "@id": "https://example.org/pages/dup",
      title: "Second",
      _source: nodeSource(fileB),
    },
  ] as VaultNode[];

  const errors = validateLinkIntegrity(nodes);

  assertEquals(errors.length, 1);
  assertStringIncludes(errors[0].message, "Duplicate @id");
});

Deno.test("validateLinkIntegrity - rejects unresolved internal link", () => {
  const nodes = [
    {
      "@type": "basis:Page",
      "@id": "https://example.org/pages/one",
      title: "One",
      mentions: [{ "@id": "https://example.org/pages/missing" }],
      _source: nodeSource(join("vault", "pages", "one.jsonld")),
    },
  ] as VaultNode[];

  const errors = validateLinkIntegrity(nodes);

  assertEquals(errors.length, 1);
  assertStringIncludes(errors[0].message, "Unresolved internal link");
});

Deno.test("validateLinkIntegrity - allows fragment link when base exists", () => {
  const nodes = [
    {
      "@type": "basis:Page",
      "@id": "https://example.org/pages/one",
      title: "One",
      mentions: [{ "@id": "https://example.org/pages/one#intro" }],
      _source: nodeSource(join("vault", "pages", "one.jsonld")),
    },
  ] as VaultNode[];

  const errors = validateLinkIntegrity(nodes);

  assertEquals(errors.length, 0);
});

Deno.test("validateLinkIntegrity - accepts inline definitions as targets", () => {
  const nodes = [
    {
      "@type": "Catalog",
      "@id": "https://example.org/catalog",
      dataset: [
        {
          "@id": "https://example.org/refs/",
          "@type": "Dataset",
          title: "Refs",
        },
      ],
      _source: nodeSource(join("vault", "catalog.jsonld")),
    },
    {
      "@type": "basis:Page",
      "@id": "https://example.org/pages/one",
      title: "One",
      mentions: [{ "@id": "https://example.org/refs/" }],
      _source: nodeSource(join("vault", "pages", "one.jsonld")),
    },
  ] as VaultNode[];

  const errors = validateLinkIntegrity(nodes);

  assertEquals(errors.length, 0);
});

Deno.test("validateLinkIntegrity - enforces refs file placement", () => {
  const nodes = [
    {
      "@type": "basis:Reference",
      "@id": "https://example.org/refs/test-ref",
      title: "Test Ref",
      url: "https://example.org/resource",
      _source: nodeSource(join("vault", "pages", "test-ref.jsonld")),
    },
  ] as VaultNode[];

  const errors = validateLinkIntegrity(nodes);

  assertEquals(errors.length, 1);
  assertStringIncludes(
    errors[0].message,
    "Reference node must live under refs/",
  );
});
