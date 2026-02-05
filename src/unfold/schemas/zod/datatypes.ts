/**
 * Schema.org-inspired primitive datatypes for JSON-LD validation.
 */

import { z } from "zod";

export const BooleanType = z.boolean();
export const DateType = z.string().date();
export const DateTimeType = z.string().datetime();
export const NumberType = z.number();
export const FloatType = z.number();
export const IntegerType = z.number().int();
export const TextType = z.string();
export const CssSelectorType = z.string().min(1);
export const PronounceableTextType = z.string().min(1);
export const UrlType = z.string().url();
export const XPathType = z.string().min(1);
export const TimeType = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/);

export type DataType =
  | z.infer<typeof BooleanType>
  | z.infer<typeof DateType>
  | z.infer<typeof DateTimeType>
  | z.infer<typeof NumberType>
  | z.infer<typeof FloatType>
  | z.infer<typeof IntegerType>
  | z.infer<typeof TextType>
  | z.infer<typeof CssSelectorType>
  | z.infer<typeof PronounceableTextType>
  | z.infer<typeof UrlType>
  | z.infer<typeof XPathType>
  | z.infer<typeof TimeType>;
