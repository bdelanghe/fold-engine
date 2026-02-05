import { assertEquals } from "@std/assert";
import type { VaultNode } from "../inputs/jsonld/types.ts";
import { parseShapes } from "./schema.ts";
import { validateNodesWithShapes } from "./validator.ts";

Deno.test("validateNodesWithShapes accepts valid node", () => {
  const shapes = parseShapes({
    shapes: [
      {
        id: "basis:PageShape",
        targetClass: "basis:Page",
        closed: true,
        properties: [
          { path: "@id", minCount: 1, datatype: "xsd:anyURI" },
          { path: "title", minCount: 1, datatype: "xsd:string" },
        ],
      },
    ],
  });

  const node: VaultNode = {
    "@id": "https://example.org/pages/one",
    "@type": "basis:Page",
    "title": "Valid Page",
  };

  const report = validateNodesWithShapes([node], shapes.shapes);

  assertEquals(report.ok, true);
  assertEquals(report.violations.length, 0);
});

Deno.test("validateNodesWithShapes reports missing required values", () => {
  const shapes = parseShapes({
    shapes: [
      {
        id: "basis:PageShape",
        targetClass: "basis:Page",
        properties: [
          { path: "title", minCount: 1 },
        ],
      },
    ],
  });

  const node: VaultNode = {
    "@id": "https://example.org/pages/one",
    "@type": "basis:Page",
  };

  const report = validateNodesWithShapes([node], shapes.shapes);

  assertEquals(report.ok, false);
  assertEquals(report.violations.length, 1);
  assertEquals(report.violations[0].path, "title");
});

Deno.test("validateNodesWithShapes reports closed shape violations", () => {
  const shapes = parseShapes({
    shapes: [
      {
        id: "basis:ClosedShape",
        targetClass: "basis:Page",
        closed: true,
        properties: [
          { path: "title" },
        ],
      },
    ],
  });

  const node: VaultNode = {
    "@id": "https://example.org/pages/one",
    "@type": "basis:Page",
    "title": "Valid Page",
    "extra": "not allowed",
  };

  const report = validateNodesWithShapes([node], shapes.shapes);

  assertEquals(report.ok, false);
  assertEquals(report.violations[0].path, "extra");
});

Deno.test("validateNodesWithShapes enforces in constraint", () => {
  const shapes = parseShapes({
    shapes: [
      {
        id: "basis:StatusShape",
        targetClass: "basis:Page",
        properties: [
          { path: "status", in: ["draft", "published"] },
        ],
      },
    ],
  });

  const node: VaultNode = {
    "@id": "https://example.org/pages/one",
    "@type": "basis:Page",
    "status": "archived",
  };

  const report = validateNodesWithShapes([node], shapes.shapes);

  assertEquals(report.ok, false);
  assertEquals(report.violations[0].path, "status");
});

Deno.test("validateNodesWithShapes enforces @id pattern", () => {
  const shapes = parseShapes({
    shapes: [
      {
        id: "basis:PageShape",
        targetClass: "basis:Page",
        properties: [
          { path: "@id", minCount: 1, pattern: "^https://.*/pages/" },
        ],
      },
    ],
  });

  const node: VaultNode = {
    "@id": "https://example.org/refs/wrong",
    "@type": "basis:Page",
    "title": "Bad Page",
  };

  const report = validateNodesWithShapes([node], shapes.shapes);

  assertEquals(report.ok, false);
  assertEquals(report.violations[0].path, "@id");
});

Deno.test("validateNodesWithShapes enforces @type allowed values", () => {
  const shapes = parseShapes({
    shapes: [
      {
        id: "basis:ReferenceShape",
        targetClass: "basis:Reference",
        properties: [
          { path: "@type", in: ["basis:Reference", "Reference"] },
        ],
      },
    ],
  });

  const node: VaultNode = {
    "@id": "https://example.org/refs/one",
    "@type": ["basis:Reference", "basis:Page"],
    "title": "Wrong Type",
    "url": "https://example.org",
  };

  const report = validateNodesWithShapes([node], shapes.shapes);

  assertEquals(report.ok, false);
  assertEquals(report.violations[0].path, "@type");
});
