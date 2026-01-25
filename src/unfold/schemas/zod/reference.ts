/**
 * Zod schema for Reference objects
 */

import { z } from "zod";
import { DateType, TextType, UrlType } from "./datatypes.ts";

/**
 * Reference schema
 */
export const ReferenceSchema = z.object({
  "@context": z.union([
    TextType,
    z.record(z.unknown()),
    z.array(z.union([TextType, z.record(z.unknown())])),
  ]).optional(),

  "@type": z.literal("basis:Reference").or(z.literal("Reference")),

  "@id": UrlType.regex(/^https:\/\/.*\/refs\//),

  title: TextType.min(1),

  description: TextType.optional(),

  url: UrlType,

  author: TextType.optional(),

  dateCreated: DateType.optional(),

  dateAccessed: DateType.optional(),
});

/**
 * TypeScript type inferred from schema
 */
export type Reference = z.infer<typeof ReferenceSchema>;
