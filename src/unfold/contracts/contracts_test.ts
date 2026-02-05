/**
 * Contract validation tests
 *
 * Pipeline:
 * 1. Load canonical JSON
 * 2. Validate with Zod schema
 * 3. Project to JSON-LD
 * 4. Verify projection is valid
 *
 * Future: Add SHACL/ShEx graph validation
 */

import { assertEquals, assertExists } from "jsr:@std/assert@1";
import { WebSiteSchema, WebPageSchema } from "./types.ts";
import { projectWebSite, projectWebPage, validateProjection } from "./projections.ts";

Deno.test("WebSite canonical JSON validates with Zod", async () => {
  const canonical = JSON.parse(
    await Deno.readTextFile("src/unfold/contracts/fixtures/website.canonical.json"),
  );

  const result = WebSiteSchema.safeParse(canonical);
  assertEquals(result.success, true, "WebSite should validate");

  if (result.success) {
    assertEquals(result.data.kind, "WebSite");
    assertEquals(result.data.name, "Unfold Vault");
    assertEquals(result.data.inLanguage, "en");
  }
});

Deno.test("WebPage canonical JSON validates with Zod", async () => {
  const canonical = JSON.parse(
    await Deno.readTextFile("src/unfold/contracts/fixtures/webpage.canonical.json"),
  );

  const result = WebPageSchema.safeParse(canonical);
  assertEquals(result.success, true, "WebPage should validate");

  if (result.success) {
    assertEquals(result.data.kind, "WebPage");
    assertEquals(result.data.name, "Hello World");
    assertExists(result.data.hasPart);
  }
});

Deno.test("WebSite canonical → JSON-LD projection", async () => {
  const canonical = JSON.parse(
    await Deno.readTextFile("src/unfold/contracts/fixtures/website.canonical.json"),
  );

  const validated = WebSiteSchema.parse(canonical);
  const jsonld = projectWebSite(validated);

  // Verify JSON-LD structure
  assertEquals(jsonld["@context"], "https://schema.org");
  assertEquals(jsonld["@type"], "WebSite");
  assertEquals(jsonld["@id"], "https://example.org");
  assertEquals(jsonld["name"], "Unfold Vault");
  assertEquals(jsonld["inLanguage"], "en");

  // Verify hasPart has isPartOf back-links
  const hasPart = jsonld.hasPart as Array<Record<string, unknown>>;
  assertExists(hasPart);
  assertEquals(hasPart.length, 2);
  assertEquals(hasPart[0]["@type"], "WebPage");
  assertEquals((hasPart[0].isPartOf as Record<string, unknown>)["@id"], "https://example.org");
});

Deno.test("WebPage canonical → JSON-LD projection", async () => {
  const canonical = JSON.parse(
    await Deno.readTextFile("src/unfold/contracts/fixtures/webpage.canonical.json"),
  );

  const validated = WebPageSchema.parse(canonical);
  const jsonld = projectWebPage(validated);

  // Verify JSON-LD structure
  assertEquals(jsonld["@context"], "https://schema.org");
  assertEquals(jsonld["@type"], "WebPage");
  assertEquals(jsonld["@id"], "https://example.org/pages/hello");
  assertEquals(jsonld["name"], "Hello World");

  // Verify isPartOf link
  const isPartOf = jsonld.isPartOf as Record<string, unknown>;
  assertExists(isPartOf);
  assertEquals(isPartOf["@id"], "https://example.org");

  // Verify hasPart sections
  const hasPart = jsonld.hasPart as Array<Record<string, unknown>>;
  assertExists(hasPart);
  assertEquals(hasPart.length, 2);
  assertEquals(hasPart[0]["@type"], "WebPageElement");
});

Deno.test("Projection validation catches invalid structure", () => {
  const validSite = {
    kind: "WebSite" as const,
    id: "https://example.org",
    url: "https://example.org",
    name: "Test Site",
    inLanguage: "en",
  };

  const validated = WebSiteSchema.parse(validSite);
  const isValid = validateProjection(validated);
  assertEquals(isValid, true, "Valid canonical should project correctly");
});

Deno.test("Zod rejects invalid WebSite", () => {
  const invalid = {
    kind: "WebSite",
    id: "not-a-url", // Invalid URL
    url: "https://example.org",
    name: "",  // Empty name
    inLanguage: "eng", // Invalid language code
  };

  const result = WebSiteSchema.safeParse(invalid);
  assertEquals(result.success, false, "Invalid canonical should fail validation");
});

Deno.test("Zod rejects invalid WebPage", () => {
  const invalid = {
    kind: "WebPage",
    // missing required fields: id, url, name
    description: "Some description",
  };

  const result = WebPageSchema.safeParse(invalid);
  assertEquals(result.success, false, "WebPage missing required fields should fail");
});
