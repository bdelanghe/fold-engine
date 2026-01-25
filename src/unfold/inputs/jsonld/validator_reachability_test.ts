import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import type { VaultNode } from "./types.ts";
import { validateReachability } from "./validator_reachability.ts";

const nodeSource = (file: string) => ({ file, path: file });

Deno.test("validateReachability - dataset roots make prefixed nodes reachable", async () => {
  const nodes = [
    {
      "@type": "Catalog",
      "@id": "https://example.org/catalog",
      dataset: [{ "@id": "https://example.org/pages/" }],
      _source: nodeSource(join("vault", "catalog.jsonld")),
    },
    {
      "@type": "basis:Page",
      "@id": "https://example.org/pages/a",
      title: "A",
      _source: nodeSource(join("vault", "pages", "a.jsonld")),
    },
  ] as VaultNode[];

  const errors = await validateReachability(nodes);

  assertEquals(errors.length, 0);
});

Deno.test("validateReachability - flags unreachable node", async () => {
  const nodes = [
    {
      "@type": "Catalog",
      "@id": "https://example.org/catalog",
      dataset: [{ "@id": "https://example.org/pages/" }],
      _source: nodeSource(join("vault", "catalog.jsonld")),
    },
    {
      "@type": "basis:Page",
      "@id": "https://example.org/pages/a",
      title: "A",
      _source: nodeSource(join("vault", "pages", "a.jsonld")),
    },
    {
      "@type": "basis:Reference",
      "@id": "https://example.org/refs/orphan",
      title: "Orphan",
      url: "https://example.org/orphan",
      _source: nodeSource(join("vault", "refs", "orphan.jsonld")),
    },
  ] as VaultNode[];

  const errors = await validateReachability(nodes);

  assertEquals(errors.length, 1);
  assertStringIncludes(errors[0].message, "Unreachable node detected");
});

Deno.test("validateReachability - skips draft nodes", async () => {
  const nodes = [
    {
      "@type": "Catalog",
      "@id": "https://example.org/catalog",
      dataset: [{ "@id": "https://example.org/pages/" }],
      _source: nodeSource(join("vault", "catalog.jsonld")),
    },
    {
      "@type": "basis:Page",
      "@id": "https://example.org/pages/a",
      title: "A",
      _source: nodeSource(join("vault", "pages", "a.jsonld")),
    },
    {
      "@type": "basis:Reference",
      "@id": "https://example.org/refs/draft",
      title: "Draft",
      url: "https://example.org/draft",
      status: "draft",
      _source: nodeSource(join("vault", "refs", "draft.jsonld")),
    },
  ] as VaultNode[];

  const errors = await validateReachability(nodes);

  assertEquals(errors.length, 0);
});

Deno.test("validateReachability - entrypoint root makes target reachable", async () => {
  const nodes = [
    {
      "@type": "basis:VaultIndex",
      "@id": "https://example.org/index",
      entrypoint: [{ "@id": "https://example.org/pages/home" }],
      _source: nodeSource(join("vault", "index.jsonld")),
    },
    {
      "@type": "basis:Page",
      "@id": "https://example.org/pages/home",
      title: "Home",
      _source: nodeSource(join("vault", "pages", "home.jsonld")),
    },
  ] as VaultNode[];

  const errors = await validateReachability(nodes);

  assertEquals(errors.length, 0);
});
