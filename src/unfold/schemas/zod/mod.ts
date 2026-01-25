/**
 * Zod schemas for all JSON-LD node types
 *
 * Export all schemas and types
 */

export * from "./page.ts";
export * from "./reference.ts";
export * from "./concept.ts";
export * from "./webpage.ts";

import { PageSchema } from "./page.ts";
import { ReferenceSchema } from "./reference.ts";
import { ConceptSchema } from "./concept.ts";
import { WebPageSchema } from "./webpage.ts";

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
