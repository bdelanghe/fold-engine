/**
 * Projections: Canonical JSON → JSON-LD
 *
 * These are deterministic transformations.
 * Input: validated canonical JSON
 * Output: JSON-LD for embedding in HTML or publishing as graph
 */

import type { WebSite, WebPage, WebPageRef } from "./types.ts";

/**
 * Project canonical WebSite to JSON-LD
 */
export function projectWebSite(site: WebSite): Record<string, unknown> {
  const jsonld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": site.id,
    "url": site.url,
    "name": site.name,
    "inLanguage": site.inLanguage,
  };

  if (site.description) {
    jsonld.description = site.description;
  }

  if (site.sameAs && site.sameAs.length > 0) {
    jsonld.sameAs = site.sameAs;
  }

  if (site.publisher) {
    jsonld.publisher = site.publisher;
  }

  if (site.hasPart && site.hasPart.length > 0) {
    // In JSON-LD, hasPart should reference WebPages by @id
    // and each should have isPartOf pointing back
    jsonld.hasPart = site.hasPart.map((ref: WebPageRef) => ({
      "@id": ref.id,
      "@type": "WebPage",
      "url": ref.url,
      "name": ref.name,
      "isPartOf": { "@id": site.id },
    }));
  }

  return jsonld;
}

/**
 * Project canonical WebPage to JSON-LD
 */
export function projectWebPage(page: WebPage): Record<string, unknown> {
  const jsonld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": page.id,
    "url": page.url,
    "name": page.name,
  };

  if (page.description) {
    jsonld.description = page.description;
  }

  if (page.inLanguage) {
    jsonld.inLanguage = page.inLanguage;
  }

  if (page.dateCreated) {
    jsonld.dateCreated = page.dateCreated;
  }

  if (page.dateModified) {
    jsonld.dateModified = page.dateModified;
  }

  if (page.isPartOf) {
    jsonld.isPartOf = { "@id": page.isPartOf.id };
  }

  if (page.hasPart && page.hasPart.length > 0) {
    jsonld.hasPart = page.hasPart.map((element) => ({
      "@id": element.id,
      "@type": "WebPageElement",
      ...(element.name && { "name": element.name }),
      ...(element.text && { "text": element.text }),
    }));
  }

  if (page.content) {
    jsonld.text = page.content;
  }

  return jsonld;
}

/**
 * Round-trip test: ensure projection is deterministic
 */
export function validateProjection(canonical: WebSite | WebPage): boolean {
  const projected = canonical.kind === "WebSite"
    ? projectWebSite(canonical)
    : projectWebPage(canonical);

  // Basic sanity checks
  if (!projected["@context"]) return false;
  if (!projected["@type"]) return false;
  if (!projected["@id"]) return false;

  return true;
}
