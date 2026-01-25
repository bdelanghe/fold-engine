/**
 * Zod schema for schema.org WebSite objects
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

export const WebSiteSchema = z.object({
  "@context": ContextSchema,

  "@type": z.literal("schema:WebSite").or(z.literal("WebSite")),

  "@id": UrlSchema,

  title: TextType.min(1).optional(),

  name: TextType.min(1).optional(),

  description: TextType.optional(),

  url: UrlSchema.optional(),

  inLanguage: TextType.optional(),

  sameAs: z.array(UrlSchema).optional(),

  hasPart: z.array(UrlOrNodeRefSchema).optional(),

  publisher: UrlOrNodeRefSchema.optional(),

  potentialAction: UrlOrNodeRefListSchema.optional(),
}).superRefine((value, ctx) => {
  if (!value.title && !value.name) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "WebSite requires either title or name",
      path: ["title"],
    });
  }
});

export type WebSite = z.infer<typeof WebSiteSchema>;
