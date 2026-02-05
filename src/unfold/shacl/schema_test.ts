import { assertEquals } from "@std/assert";
import { ShapesSchema } from "./schema.ts";

Deno.test("ShapesSchema rejects invalid regex patterns", () => {
  const result = ShapesSchema.safeParse({
    shapes: [
      {
        id: "basis:BadPattern",
        targetClass: "basis:Page",
        properties: [
          {
            path: "title",
            pattern: "[unclosed",
          },
        ],
      },
    ],
  });

  assertEquals(result.success, false);
});

Deno.test("ShapesSchema rejects minCount > maxCount", () => {
  const result = ShapesSchema.safeParse({
    shapes: [
      {
        id: "basis:BadCounts",
        targetClass: "basis:Page",
        properties: [
          {
            path: "title",
            minCount: 2,
            maxCount: 1,
          },
        ],
      },
    ],
  });

  assertEquals(result.success, false);
});
