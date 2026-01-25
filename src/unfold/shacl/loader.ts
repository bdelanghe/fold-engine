import { join } from "@std/path";
import { parseShapes, type ShapesDocument } from "./schema.ts";

const getShapesPath = (): string =>
  Deno.env.get("SHACL_SHAPES_PATH")?.trim() ||
  join(Deno.cwd(), "src", "unfold", "shacl", "shapes.json");

export const loadShapes = async (): Promise<ShapesDocument> => {
  const path = getShapesPath();
  const content = await Deno.readTextFile(path);
  const parsed = JSON.parse(content);
  return parseShapes(parsed);
};
