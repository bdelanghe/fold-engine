/**
 * Zod schema for Concept/vocabulary term objects
 */

import { z } from "zod";
import { TextType, UrlType } from "./datatypes.ts";

/**
 * Node reference schema
 */
const NodeRefSchema = z.object({
  "@id": UrlType,
});

/**
 * Concept schema (SKOS-style vocabulary terms)
 */
export const ConceptSchema = z.object({
  "@id": UrlType.regex(/^https:\/\/.*\/vocab\//),

  "@type": z.union([
    TextType,
    z.array(TextType),
  ]),

  label: TextType.min(1),

  definition: TextType.optional(),

  broader: NodeRefSchema.optional(),

  narrower: z.array(NodeRefSchema).optional(),

  related: z.array(NodeRefSchema).optional(),
});

/**
 * TypeScript type inferred from schema
 */
export type Concept = z.infer<typeof ConceptSchema>;
