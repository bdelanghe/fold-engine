import { extractYaml } from "jsr:@std/front-matter";
import { z } from "npm:zod";

const frontmatterSchema = z
  .object({
    title: z.string().min(1),
    tags: z.array(z.string().min(1)).optional(),
    schema: z.string().min(1).optional(),
    fold: z.string().min(1).optional(),
    layout: z.string().min(1).optional(),
    jsonld: z.union([z.string().min(1), z.record(z.string(), z.unknown())]),
    url: z.string().min(1).optional(),
    cog_schema: z.string().min(1).optional(),
    entrypoints: z
      .array(
        z
          .object({
            name: z.string().min(1),
            url: z.string().min(1),
            role: z.string().min(1).optional(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

const jsonLdSchema = z
  .object({
    "@context": z.union([
      z.string().min(1),
      z.record(z.string(), z.unknown()),
    ]),
  })
  .passthrough();
const siteUrl = (Deno.env.get("SITE_URL") ?? "https://fold.example").replace(
  /\/$/,
  "",
);

const buildVaultIndexJsonLd = (
  title: string,
  pageUrl: string,
  entrypoints: { name?: string; url?: string; role?: string }[],
) => {
  const entrypointUrls = entrypoints
    .map((entry) => (entry.url ? `${siteUrl}${entry.url}` : ""))
    .filter(Boolean);

  return {
    "@context": {
      schema: "https://schema.org/",
      basis: `${siteUrl}/vocab/basis#`,
      name: "schema:name",
      url: "schema:url",
      isPartOf: { "@id": "schema:isPartOf", "@type": "@id" },
      entrypoint: { "@id": "basis:entrypoint", "@type": "@id" },
      role: "basis:role",
    },
    "@graph": [
      {
        "@id": `${siteUrl}/#site`,
        "@type": "schema:WebSite",
        name: title,
        url: `${siteUrl}/`,
      },
      {
        "@id": pageUrl,
        "@type": ["schema:CollectionPage", "basis:VaultIndex"],
        name: title,
        url: pageUrl,
        isPartOf: `${siteUrl}/#site`,
        role: "vault.index",
        entrypoint: entrypointUrls,
      },
      ...entrypoints
        .filter((entry) => entry.url)
        .map((entry) => ({
          "@id": `${siteUrl}${entry.url}`,
          "@type": ["schema:WebPage", "basis:Fold"],
          name: entry.name ?? "",
          url: `${siteUrl}${entry.url}`,
          role: entry.role ?? "",
        })),
    ],
  };
};

const noteSchema = z
  .object({
    path: z.string().min(1),
    frontmatter: frontmatterSchema,
    content: z.string().min(1),
  })
  .strict();

const allowedFenceLanguages = new Set([
  "bash",
  "css",
  "diff",
  "html",
  "ini",
  "javascript",
  "js",
  "json",
  "markdown",
  "md",
  "shell",
  "sql",
  "text",
  "ts",
  "tsx",
  "typescript",
  "txt",
  "yaml",
  "yml",
]);

const fencePattern = /^```([^\s`]*)/gm;

const findFenceLanguages = (content: string): string[] => {
  const languages: string[] = [];
  for (const match of content.matchAll(fencePattern)) {
    languages.push(match[1] ?? "");
  }
  return languages;
};

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

export const validateNotes = async (): Promise<void> => {
  const errors: string[] = [];

  for await (const fileUrl of walk(sourceRoot)) {
    const path = fileUrl.pathname;
    if (!mdExtensions.has(path.slice(path.lastIndexOf(".")))) continue;

    const content = await Deno.readTextFile(fileUrl);
    const { attrs, body } = extractYaml(content);

    const result = noteSchema.safeParse({
      path,
      frontmatter: attrs,
      content: body ?? "",
    });
    if (!result.success) {
      const formatted = result.error.issues
        .map((issue) => `- ${issue.path.join(".") || "root"}: ${issue.message}`)
        .join("\n");
      errors.push(`${path}\n${formatted}`);
      continue;
    }

    const fenceLanguages = findFenceLanguages(result.data.content);
    const invalidFenceLanguages = fenceLanguages.filter(
      (language) =>
        language.length === 0 || !allowedFenceLanguages.has(language),
    );
    if (invalidFenceLanguages.length > 0) {
      const formatted = invalidFenceLanguages
        .map((language) =>
          `- fence language: ${language.length > 0 ? language : "(missing)"}`
        )
        .join("\n");
      errors.push(`${path}\n${formatted}`);
    }

    const jsonld = result.data.frontmatter.jsonld;
    let jsonldObject: Record<string, unknown> | null = null;
    if (typeof jsonld === "string") {
      if (jsonld === "vault_index") {
        const pageUrl = result.data.frontmatter.url
          ? `${siteUrl}${result.data.frontmatter.url}`
          : "";
        if (!pageUrl || !result.data.frontmatter.entrypoints) {
          errors.push(
            `${path}\n- jsonld: vault_index requires url and entrypoints`,
          );
          continue;
        }
        jsonldObject = buildVaultIndexJsonLd(
          result.data.frontmatter.title,
          pageUrl,
          result.data.frontmatter.entrypoints,
        );
      } else {
        try {
          jsonldObject = JSON.parse(jsonld);
        } catch (error) {
          errors.push(
            `${path}\n- jsonld: invalid JSON (${(error as Error).message})`,
          );
          continue;
        }
      }
    } else {
      jsonldObject = jsonld;
    }

    const jsonldResult = jsonLdSchema.safeParse(jsonldObject);
    if (!jsonldResult.success) {
      const formatted = jsonldResult.error.issues
        .map((issue) =>
          `- jsonld${issue.path.length > 0 ? "." : ""}${
            issue.path.join(".")
          }: ${issue.message}`
        )
        .join("\n");
      errors.push(`${path}\n${formatted}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Note validation failed:\n\n${errors.join("\n\n")}`);
  }
};

if (import.meta.main) {
  await validateNotes();
  console.log("Note validation passed.");
}
