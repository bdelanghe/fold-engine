/**
 * Zod schema for schema.org Person objects
 */

import { z } from "zod";
import { TextType, UrlType } from "./datatypes.ts";
import { NodeRefSchema } from "./page.ts";

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

export const PersonSchema = z.object({
  "@context": ContextSchema,

  "@type": z.literal("schema:Person").or(z.literal("Person")),

  "@id": UrlSchema,

  name: TextType.min(1),

  description: TextType.optional(),

  url: UrlSchema.optional(),

  sameAs: z.array(UrlSchema).optional(),

  affiliation: UrlOrNodeRefListSchema.optional(),

  worksFor: UrlOrNodeRefListSchema.optional(),

  knowsAbout: z.union([TextType, z.array(TextType)]).optional(),
});

export type Person = z.infer<typeof PersonSchema>;
