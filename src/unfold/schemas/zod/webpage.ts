/**
 * Zod schema for schema.org WebPage objects
 */

import { z } from "zod";
import { NodeRefSchema, SectionSchema } from "./page.ts";

const ContextSchema = z.union([
  z.string(),
  z.record(z.unknown()),
  z.array(z.union([z.string(), z.record(z.unknown())])),
]).optional();

const UrlSchema = z.string().url();
const UrlOrNodeRefSchema = z.union([UrlSchema, NodeRefSchema]);
const UrlOrNodeRefListSchema = z.union([
  UrlOrNodeRefSchema,
  z.array(UrlOrNodeRefSchema),
]);
const TextOrStringArraySchema = z.union([z.string(), z.array(z.string())]);
const TextOrUrlOrNodeRefSchema = z.union([z.string(), UrlOrNodeRefSchema]);
const TextOrUrlOrNodeRefListSchema = z.union([
  TextOrUrlOrNodeRefSchema,
  z.array(TextOrUrlOrNodeRefSchema),
]);

export const WebPageSchema = z.object({
  "@context": ContextSchema,

  "@type": z.literal("schema:WebPage").or(z.literal("WebPage")),

  "@id": UrlSchema.regex(/^https:\/\/.*\/pages\//),

  title: z.string().min(1).optional(),

  name: z.string().min(1).optional(),

  description: z.string().optional(),

  abstract: z.string().optional(),

  headline: z.string().optional(),

  alternativeHeadline: z.string().optional(),

  dateCreated: z.string().date().optional(),

  dateModified: z.string().date().optional(),

  datePublished: z.string().date().optional(),

  lastReviewed: z.string().date().optional(),

  inLanguage: z.string().optional(),

  keywords: TextOrStringArraySchema.optional(),

  url: UrlSchema.optional(),

  sameAs: z.array(UrlSchema).optional(),

  isBasedOn: UrlOrNodeRefListSchema.optional(),

  isPartOf: UrlOrNodeRefSchema.optional(),

  hasPart: z.array(
    z.union([
      UrlSchema,
      NodeRefSchema,
      SectionSchema,
    ]),
  ).optional(),

  about: UrlOrNodeRefListSchema.optional(),

  mentions: z.array(UrlOrNodeRefSchema).optional(),

  mainEntity: UrlOrNodeRefSchema.optional(),

  mainEntityOfPage: UrlOrNodeRefSchema.optional(),

  primaryImageOfPage: UrlOrNodeRefSchema.optional(),

  image: UrlOrNodeRefListSchema.optional(),

  author: TextOrUrlOrNodeRefListSchema.optional(),

  creator: TextOrUrlOrNodeRefListSchema.optional(),

  contributor: TextOrUrlOrNodeRefListSchema.optional(),

  publisher: TextOrUrlOrNodeRefListSchema.optional(),

  breadcrumb: z.union([z.string(), UrlOrNodeRefSchema]).optional(),

  license: UrlOrNodeRefSchema.optional(),

  relatedLink: z.array(UrlSchema).optional(),

  significantLink: z.array(UrlSchema).optional(),

  citation: TextOrUrlOrNodeRefListSchema.optional(),

  contentRating: z.union([z.string(), UrlOrNodeRefSchema]).optional(),

  contentLocation: UrlOrNodeRefSchema.optional(),

  genre: TextOrStringArraySchema.optional(),

  educationalUse: TextOrStringArraySchema.optional(),

  learningResourceType: TextOrStringArraySchema.optional(),

  timeRequired: z.string().optional(),

  audience: UrlOrNodeRefSchema.optional(),

  isFamilyFriendly: z.boolean().optional(),

  accessibleForFree: z.boolean().optional(),
}).superRefine((value, ctx) => {
  if (!value.title && !value.name) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "WebPage requires either title or name",
      path: ["title"],
    });
  }
});

export type WebPage = z.infer<typeof WebPageSchema>;
