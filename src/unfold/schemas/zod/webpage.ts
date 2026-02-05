/**
 * Zod schema for schema.org WebPage objects
 */

import { z } from "zod";
import { NodeRefSchema, SectionSchema } from "./page.ts";
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
const TextOrStringArraySchema = z.union([TextType, z.array(TextType)]);
const TextOrUrlOrNodeRefSchema = z.union([TextType, UrlOrNodeRefSchema]);
const TextOrUrlOrNodeRefListSchema = z.union([
  TextOrUrlOrNodeRefSchema,
  z.array(TextOrUrlOrNodeRefSchema),
]);

const WEBPAGE_TYPES = [
  "schema:WebPage",
  "WebPage",
  "schema:ItemPage",
  "ItemPage",
  "schema:CollectionPage",
  "CollectionPage",
  "schema:AboutPage",
  "AboutPage",
  "schema:FAQPage",
  "FAQPage",
  "schema:QAPage",
  "QAPage",
  "schema:ProfilePage",
  "ProfilePage",
  "schema:SearchResultsPage",
  "SearchResultsPage",
] as const;

export const WebPageSchema = z.object({
  "@context": ContextSchema,

  "@type": z.enum(WEBPAGE_TYPES),

  "@id": UrlSchema.regex(/^https:\/\/.*\/pages\//),

  title: TextType.min(1).optional(),

  name: TextType.min(1).optional(),

  description: TextType.optional(),

  abstract: TextType.optional(),

  headline: TextType.optional(),

  alternativeHeadline: TextType.optional(),

  dateCreated: DateType.optional(),

  dateModified: DateType.optional(),

  datePublished: DateType.optional(),

  lastReviewed: DateType.optional(),

  inLanguage: TextType.optional(),

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
