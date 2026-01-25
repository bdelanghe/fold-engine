/**
 * Zod schema for Concept/vocabulary term objects
 */

import { z } from "zod";

/**
 * Node reference schema
 */
const NodeRefSchema = z.object({
  "@id": z.string().url(),
});

/**
 * Concept schema (SKOS-style vocabulary terms)
 */
export const ConceptSchema = z.object({
  "@id": z.string().url().regex(/^https:\/\/.*\/vocab\//),

  "@type": z.union([
    z.string(),
    z.array(z.string()),
  ]),

  label: z.string().min(1),

  definition: z.string().optional(),

  broader: NodeRefSchema.optional(),

  narrower: z.array(NodeRefSchema).optional(),

  related: z.array(NodeRefSchema).optional(),
});

/**
 * TypeScript type inferred from schema
 */
export type Concept = z.infer<typeof ConceptSchema>;
