/**
 * Zod schema for Reference objects
 */

import { z } from "zod";

/**
 * Reference schema
 */
export const ReferenceSchema = z.object({
  "@context": z.union([
    z.string(),
    z.record(z.unknown()),
    z.array(z.union([z.string(), z.record(z.unknown())])),
  ]).optional(),

  "@type": z.literal("basis:Reference").or(z.literal("Reference")),

  "@id": z.string().url().regex(/^https:\/\/.*\/refs\//),

  title: z.string().min(1),

  description: z.string().optional(),

  url: z.string().url(),

  author: z.string().optional(),

  dateCreated: z.string().date().optional(),

  dateAccessed: z.string().date().optional(),
});

/**
 * TypeScript type inferred from schema
 */
export type Reference = z.infer<typeof ReferenceSchema>;
