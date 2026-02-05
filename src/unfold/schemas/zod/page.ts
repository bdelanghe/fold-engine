/**
 * Zod schema for Page objects
 *
 * Define in Zod for type-safe validation,
 * can generate JSON Schema from this
 */

import { z } from "zod";
import { DateType, TextType, UrlType } from "./datatypes.ts";

/**
 * Page section schema
 */
export const SectionSchema = z.object({
  "@id": UrlType,
  "@type": z.literal("basis:Section").or(z.literal("Section")),
  title: TextType.min(1),
  content: TextType.optional(),
});

/**
 * Reference to another node (just @id)
 */
export const NodeRefSchema = z.object({
  "@id": UrlType,
}).strict();

/**
 * Page schema
 */
export const PageSchema = z.object({
  "@context": z.union([
    TextType,
    z.record(z.unknown()),
    z.array(z.union([TextType, z.record(z.unknown())])),
  ]).optional(),

  "@type": z.literal("basis:Page").or(z.literal("Page")),

  "@id": UrlType.regex(/^https:\/\/.*\/pages\//),

  title: TextType.min(1),

  description: TextType.optional(),

  dateCreated: DateType.optional(),

  dateModified: DateType.optional(),

  hasPart: z.array(
    z.union([
      NodeRefSchema,
      SectionSchema,
    ]),
  ).optional(),

  mentions: z.array(NodeRefSchema).optional(),
});

/**
 * TypeScript type inferred from schema
 */
export type Page = z.infer<typeof PageSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type NodeRef = z.infer<typeof NodeRefSchema>;
