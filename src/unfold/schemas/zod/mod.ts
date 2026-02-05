/**
 * Zod schemas for all JSON-LD node types
 *
 * Export all schemas and types
 */

export * from "./page.ts";
export * from "./reference.ts";
export * from "./concept.ts";
export * from "./webpage.ts";
export * from "./website.ts";
export * from "./webpage_element.ts";
export * from "./creative_work.ts";
export * from "./defined_term.ts";
export * from "./defined_term_set.ts";
export * from "./datatypes.ts";
export * from "./person.ts";

import { PageSchema } from "./page.ts";
import { ReferenceSchema } from "./reference.ts";
import { ConceptSchema } from "./concept.ts";
import { WebPageSchema } from "./webpage.ts";
import { WebSiteSchema } from "./website.ts";
import { WebPageElementSchema } from "./webpage_element.ts";
import { CreativeWorkSchema } from "./creative_work.ts";
import { DefinedTermSchema } from "./defined_term.ts";
import { DefinedTermSetSchema } from "./defined_term_set.ts";
import { PersonSchema } from "./person.ts";

/**
 * Schema registry mapping @type to Zod schema
 */
export const SCHEMA_REGISTRY = {
  "basis:Page": PageSchema,
  "Page": PageSchema,
  "basis:Reference": ReferenceSchema,
  "Reference": ReferenceSchema,
  "rdfs:Class": ConceptSchema,
  "skos:Concept": ConceptSchema,
  "schema:WebPage": WebPageSchema,
  "WebPage": WebPageSchema,
  "schema:WebSite": WebSiteSchema,
  "WebSite": WebSiteSchema,
  "schema:WebPageElement": WebPageElementSchema,
  "WebPageElement": WebPageElementSchema,
  "schema:CreativeWork": CreativeWorkSchema,
  "CreativeWork": CreativeWorkSchema,
  "schema:DefinedTerm": DefinedTermSchema,
  "DefinedTerm": DefinedTermSchema,
  "schema:DefinedTermSet": DefinedTermSetSchema,
  "DefinedTermSet": DefinedTermSetSchema,
  "schema:Person": PersonSchema,
  "Person": PersonSchema,
} as const;

/**
 * Get schema for a node's @type
 */
export function getSchemaForType(
  type: string | string[] | undefined,
): (typeof SCHEMA_REGISTRY)[keyof typeof SCHEMA_REGISTRY] | null {
  if (!type) return null;

  const types = Array.isArray(type) ? type : [type];
  for (const t of types) {
    if (t in SCHEMA_REGISTRY) {
      return SCHEMA_REGISTRY[t as keyof typeof SCHEMA_REGISTRY];
    }
  }

  return null;
}
