import { z } from "zod";

const NonEmptyString = z.string().min(1);

const DatatypeSchema = z.enum([
  "xsd:string",
  "xsd:boolean",
  "xsd:integer",
  "xsd:decimal",
  "xsd:date",
  "xsd:dateTime",
  "xsd:anyURI",
]);

export const PropertyShapeSchema = z.object({
  path: NonEmptyString,
  minCount: z.number().int().nonnegative().optional(),
  maxCount: z.number().int().nonnegative().optional(),
  datatype: DatatypeSchema.optional(),
  pattern: NonEmptyString.optional(),
  in: z.array(NonEmptyString).nonempty().optional(),
  class: NonEmptyString.optional(),
  message: NonEmptyString.optional(),
}).strict().superRefine((shape, ctx) => {
  if (shape.pattern) {
    try {
      new RegExp(shape.pattern);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid regex pattern: ${shape.pattern}`,
        path: ["pattern"],
      });
    }
  }
  if (
    shape.minCount !== undefined &&
    shape.maxCount !== undefined &&
    shape.minCount > shape.maxCount
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "minCount cannot be greater than maxCount",
      path: ["minCount"],
    });
  }
});

export const NodeShapeSchema = z.object({
  id: NonEmptyString,
  targetClass: NonEmptyString,
  closed: z.boolean().optional(),
  ignoredProperties: z.array(NonEmptyString).optional(),
  properties: z.array(PropertyShapeSchema).default([]),
}).strict().superRefine((shape, ctx) => {
  const seen = new Set<string>();
  for (const prop of shape.properties) {
    if (seen.has(prop.path)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate property shape path: ${prop.path}`,
        path: ["properties"],
      });
      break;
    }
    seen.add(prop.path);
  }
});

export const ShapesSchema = z.object({
  shapes: z.array(NodeShapeSchema),
}).strict();

export type PropertyShape = z.infer<typeof PropertyShapeSchema>;
export type NodeShape = z.infer<typeof NodeShapeSchema>;
export type ShapesDocument = z.infer<typeof ShapesSchema>;

export const parseShapes = (input: unknown): ShapesDocument =>
  ShapesSchema.parse(input);
