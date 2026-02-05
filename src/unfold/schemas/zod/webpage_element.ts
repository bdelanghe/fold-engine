/**
 * Zod schema for schema.org WebPageElement objects
 */

import { z } from "zod";
import { NodeRefSchema } from "./page.ts";
import { IntegerType, TextType, UrlType } from "./datatypes.ts";

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

export const WebPageElementSchema = z.object({
  "@context": ContextSchema,

  "@type": z.literal("schema:WebPageElement").or(z.literal("WebPageElement")),

  "@id": UrlSchema,

  title: TextType.min(1).optional(),

  name: TextType.min(1).optional(),

  description: TextType.optional(),

  text: TextType.optional(),

  isPartOf: UrlOrNodeRefSchema,

  hasPart: z.array(UrlOrNodeRefSchema).optional(),

  about: UrlOrNodeRefListSchema.optional(),

  mentions: z.array(UrlOrNodeRefSchema).optional(),

  citation: TextOrUrlOrNodeRefListSchema.optional(),

  position: IntegerType.optional(),
}).superRefine((value, ctx) => {
  if (!value.title && !value.name) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "WebPageElement requires either title or name",
      path: ["title"],
    });
  }
});

export type WebPageElement = z.infer<typeof WebPageElementSchema>;
