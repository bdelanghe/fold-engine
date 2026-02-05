/**
 * Zod schema for schema.org DefinedTermSet objects
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

export const DefinedTermSetSchema = z.object({
  "@context": ContextSchema,

  "@type": z
    .literal("schema:DefinedTermSet")
    .or(z.literal("DefinedTermSet")),

  "@id": UrlSchema,

  name: TextType.min(1),

  description: TextType.optional(),

  hasDefinedTerm: UrlOrNodeRefListSchema.optional(),

  inLanguage: TextType.optional(),

  sameAs: z.array(UrlSchema).optional(),
});

export type DefinedTermSet = z.infer<typeof DefinedTermSetSchema>;
