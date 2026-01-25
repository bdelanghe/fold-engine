/**
 * Zod schema for Page objects
 *
 * Define in Zod for type-safe validation,
 * can generate JSON Schema from this
 */

import { z } from "zod";

/**
 * Page section schema
 */
export const SectionSchema = z.object({
  "@id": z.string().url(),
  "@type": z.literal("basis:Section").or(z.literal("Section")),
  title: z.string().min(1),
  content: z.string().optional(),
});

/**
 * Reference to another node (just @id)
 */
export const NodeRefSchema = z.object({
  "@id": z.string().url(),
});

/**
 * Page schema
 */
export const PageSchema = z.object({
  "@context": z.union([
    z.string(),
    z.record(z.unknown()),
    z.array(z.union([z.string(), z.record(z.unknown())])),
  ]).optional(),

  "@type": z.literal("basis:Page").or(z.literal("Page")),

  "@id": z.string().url().regex(/^https:\/\/.*\/pages\//),

  title: z.string().min(1),

  description: z.string().optional(),

  dateCreated: z.string().date().optional(),

  dateModified: z.string().date().optional(),

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
