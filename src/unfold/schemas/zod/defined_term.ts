/**
 * Zod schema for schema.org DefinedTerm objects
 */

import { z } from "zod";
import { NodeRefSchema } from "./page.ts";
import { TextType, UrlType } from "./datatypes.ts";

const ContextSchema = z.union([
  TextType,
  z.record(z.unknown()),
  z.array(z.union([TextType, z.record(z.unknown())])),
]).optional();

const UrlSchema = UrlType;
const UrlOrNodeRefSchema = z.union([UrlSchema, NodeRefSchema]);
const UrlOrNodeRefListSchema = z.union([
  UrlOrNodeRefSchema,
  z.array(UrlOrNodeRefSchema),
]);

export const DefinedTermSchema = z.object({
  "@context": ContextSchema,

  "@type": z.literal("schema:DefinedTerm").or(z.literal("DefinedTerm")),

  "@id": UrlSchema,

  name: TextType.min(1),

  description: TextType.optional(),

  alternateName: z.array(TextType).optional(),

  termCode: TextType.optional(),

  sameAs: z.array(UrlSchema).optional(),

  inDefinedTermSet: UrlOrNodeRefSchema.optional(),

  broader: UrlOrNodeRefListSchema.optional(),

  narrower: UrlOrNodeRefListSchema.optional(),

  related: UrlOrNodeRefListSchema.optional(),
});

export type DefinedTerm = z.infer<typeof DefinedTermSchema>;
