import { extract } from "jsr:@std/front-matter";
import { z } from "npm:zod";

const frontmatterSchema = z
  .object({
    title: z.string().min(1),
    tags: z.array(z.string()).optional(),
    schema: z.string().optional(),
    fold: z.string().optional(),
    layout: z.string().optional(),
    jsonld: z.string().optional(),
  })
  .passthrough();

const mdExtensions = new Set([".md", ".markdown"]);
const sourceRoot = new URL("../notes/", import.meta.url);

async function* walk(dir: URL): AsyncGenerator<URL> {
  for await (const entry of Deno.readDir(dir)) {
    const entryUrl = new URL(entry.name + (entry.isDirectory ? "/" : ""), dir);
    if (entry.isDirectory) {
      yield* walk(entryUrl);
      continue;
    }
    yield entryUrl;
  }
}

const errors: string[] = [];

for await (const fileUrl of walk(sourceRoot)) {
  const path = fileUrl.pathname;
  if (!mdExtensions.has(path.slice(path.lastIndexOf(".")))) continue;

  const content = await Deno.readTextFile(fileUrl);
  const { attrs } = extract(content);

  const result = frontmatterSchema.safeParse(attrs);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `- ${issue.path.join(".") || "root"}: ${issue.message}`)
      .join("\n");
    errors.push(`${path}\n${formatted}`);
  }
}

if (errors.length > 0) {
  throw new Error(`Frontmatter validation failed:\n\n${errors.join("\n\n")}`);
}

console.log("Frontmatter validation passed.");
