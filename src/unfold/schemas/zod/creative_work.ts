/**
 * Zod schema for schema.org CreativeWork objects
 */

import { z } from "zod";
import { NodeRefSchema } from "./page.ts";
import { DateType, TextType, UrlType } from "./datatypes.ts";

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
const TextOrUrlOrNodeRefSchema = z.union([z.string(), UrlOrNodeRefSchema]);
const TextOrUrlOrNodeRefListSchema = z.union([
  TextOrUrlOrNodeRefSchema,
  z.array(TextOrUrlOrNodeRefSchema),
]);

export const CreativeWorkSchema = z.object({
  "@context": ContextSchema,

  "@type": z.literal("schema:CreativeWork").or(z.literal("CreativeWork")),

  "@id": UrlSchema,

  title: TextType.min(1).optional(),

  name: TextType.min(1).optional(),

  description: TextType.optional(),

  url: UrlSchema.optional(),

  sameAs: z.array(UrlSchema).optional(),

  author: TextOrUrlOrNodeRefListSchema.optional(),

  creator: TextOrUrlOrNodeRefListSchema.optional(),

  contributor: TextOrUrlOrNodeRefListSchema.optional(),

  publisher: TextOrUrlOrNodeRefListSchema.optional(),

  dateCreated: DateType.optional(),

  dateModified: DateType.optional(),

  datePublished: DateType.optional(),

  inLanguage: TextType.optional(),

  isBasedOn: UrlOrNodeRefListSchema.optional(),

  about: UrlOrNodeRefListSchema.optional(),

  mentions: z.array(UrlOrNodeRefSchema).optional(),

  keywords: z.union([TextType, z.array(TextType)]).optional(),

  citation: TextOrUrlOrNodeRefListSchema.optional(),
}).superRefine((value, ctx) => {
  if (!value.title && !value.name) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "CreativeWork requires either title or name",
      path: ["title"],
    });
  }
});

export type CreativeWork = z.infer<typeof CreativeWorkSchema>;
