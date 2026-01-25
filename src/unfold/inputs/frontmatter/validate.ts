import { extractYaml } from "@std/front-matter";
import { basename, relative } from "@std/path";
import { z } from "zod";
import { loadVaultRoot } from "../vault/load_vault.ts";
import { siteBuildConfig } from "../../site/site_build_config.ts";

const schemaOrgSchema = z
  .object({
    pageType: z.string().min(1).optional(),
    pageSubtypes: z.array(z.string().min(1)).optional(),
    about: z
      .array(
        z
          .object({
            type: z.string().min(1),
            id: z.string().url().optional(),
            name: z.string().min(1).optional(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

const frontmatterSchema = z
  .object({
    title: z.string().min(1),
    tags: z.array(z.string().min(1)).optional(),
    schema: z.union([z.string().min(1), schemaOrgSchema]).optional(),
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
const writeWarning = (message: string): void => {
  const encoder = new TextEncoder();
  void Deno.stderr.write(encoder.encode(`${message}\n`));
};
const getSiteUrl = (): string => siteBuildConfig.siteUrl;

const buildVaultIndexJsonLd = (
  title: string,
  pageUrl: string,
  entrypoints: { name?: string; url?: string; role?: string }[],
) => {
  const siteUrl = getSiteUrl();
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

const fencePattern = /^```([^\s`]*)/;

const findFenceLanguages = (content: string): string[] => {
  const languages: string[] = [];
  let inFence = false;

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(fencePattern);
    if (!match) continue;

    const language = match[1] ?? "";
    if (!inFence) {
      languages.push(language);
      inFence = true;
      continue;
    }
    inFence = false;
  }

  return languages;
};

export const validateNoteContent = (
  path: string,
  content: string,
): string[] => {
  const errors: string[] = [];
  let attrs: Record<string, unknown>;
  let body: string | undefined;
  try {
    const extracted = extractYaml(content) as {
      attrs: Record<string, unknown>;
      body?: string;
    };
    attrs = extracted.attrs;
    body = extracted.body;
  } catch (error) {
    errors.push(
      `${path}\n- frontmatter: invalid (${(error as Error).message})`,
    );
    return errors;
  }

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
    return errors;
  }

  const fenceLanguages = findFenceLanguages(result.data.content);
  const invalidFenceLanguages = fenceLanguages.filter(
    (language) => language.length === 0 || !allowedFenceLanguages.has(language),
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
      const siteUrl = getSiteUrl();
      const pageUrl = result.data.frontmatter.url
        ? `${siteUrl}${result.data.frontmatter.url}`
        : "";
      if (!pageUrl || !result.data.frontmatter.entrypoints) {
        errors.push(
          `${path}\n- jsonld: vault_index requires url and entrypoints`,
        );
        return errors;
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
        return errors;
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

  return errors;
};

const mdExtensions = new Set([".md", ".markdown"]);

const IGNORED_PREFIXES = [
  ".cursor/",
  ".devcontainer/",
  ".git/",
  ".github/",
  ".unfold/",
  ".vscode/",
  "dist/",
  "node_modules/",
  "src/",
  "src/unfold/vault_api/support/",
  "vendor/",
];

const IGNORED_FILES = new Set([
  ".cursorindexingignore",
  ".dockerignore",
  ".gitignore",
  ".nojekyll",
  "deno.json",
  "deno.lock",
  "docker-bake.hcl",
  "docker-compose.yml",
  "Dockerfile",
]);

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
  const sourceRoot = loadVaultRoot();
  try {
    await Deno.stat(sourceRoot);
  } catch {
    console.warn("Skipping note validation (missing vault content).");
    return;
  }
  const errors: string[] = [];
  const rootPath = sourceRoot.pathname;

  for await (const fileUrl of walk(sourceRoot)) {
    const path = fileUrl.pathname;
    if (!mdExtensions.has(path.slice(path.lastIndexOf(".")))) continue;
    if (basename(path).startsWith(".")) continue;
    const relPath = relative(rootPath, path).replaceAll("\\", "/");
    if (
      IGNORED_FILES.has(relPath) ||
      IGNORED_PREFIXES.some((prefix) => relPath.startsWith(prefix))
    ) {
      continue;
    }
    const content = await Deno.readTextFile(fileUrl);
    errors.push(...validateNoteContent(path, content));
  }

  if (errors.length > 0) {
    throw new Error(`Note validation failed:\n\n${errors.join("\n\n")}`);
  }
};

if (import.meta.main) {
  void validateNotes()
    .then(() => {
      const encoder = new TextEncoder();
      void Deno.stdout.write(encoder.encode("Note validation passed.\n"));
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      const encoder = new TextEncoder();
      void Deno.stderr.write(encoder.encode(`${message}\n`));
      Deno.exit(1);
    });
}
