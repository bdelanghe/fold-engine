/**
 * Canonical JSON types for semantic website contracts
 *
 * These are the source-of-truth types that get validated with Zod,
 * then compiled to JSON-LD for publication.
 *
 * DO NOT author JSON-LD directly. Author these, validate, then project.
 */

import { z } from "npm:zod@3.24.1";

/**
 * WebPage reference (for use in WebSite.hasPart)
 */
export const WebPageRefSchema = z.object({
  kind: z.literal("WebPage"),
  id: z.string().url(),
  url: z.string().url(),
  name: z.string().min(1),
});

export type WebPageRef = z.infer<typeof WebPageRefSchema>;

/**
 * WebSite reference (for use in WebPage.isPartOf)
 */
export const WebSiteRefSchema = z.object({
  kind: z.literal("WebSite"),
  id: z.string().url(),
});

export type WebSiteRef = z.infer<typeof WebSiteRefSchema>;

/**
 * WebPageElement (section/component of a page)
 */
export const WebPageElementSchema = z.object({
  kind: z.literal("WebPageElement"),
  id: z.string().url(),
  name: z.string().optional(),
  text: z.string().optional(),
});

export type WebPageElement = z.infer<typeof WebPageElementSchema>;

/**
 * Canonical WebSite contract
 *
 * This is what your build system should emit for the site root.
 * JSON Schema validates this shape before JSON-LD projection.
 */
export const WebSiteSchema = z.object({
  kind: z.literal("WebSite"),
  id: z.string().url(),
  url: z.string().url(),
  name: z.string().min(1),
  description: z.string().optional(),
  inLanguage: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/),
  sameAs: z.array(z.string().url()).optional(),
  publisher: z.string().url().optional(),
  hasPart: z.array(WebPageRefSchema).optional(),
});

export type WebSite = z.infer<typeof WebSiteSchema>;

/**
 * Canonical WebPage contract
 *
 * This is what your build system should emit for each page.
 * JSON Schema validates this shape before JSON-LD projection.
 */
export const WebPageSchema = z.object({
  kind: z.literal("WebPage"),
  id: z.string().url(),
  url: z.string().url(),
  name: z.string().min(1),
  description: z.string().optional(),
  inLanguage: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/).optional(),
  dateCreated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateModified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  isPartOf: WebSiteRefSchema.optional(),
  hasPart: z.array(WebPageElementSchema).optional(),
  content: z.string().optional(),
});

export type WebPage = z.infer<typeof WebPageSchema>;
