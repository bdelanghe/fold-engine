import Ajv from "ajv";
import { assert, assertEquals } from "@std/assert";
import { generateSiteManifest } from "../src/site/manifest.ts";
import expectations from "./contracts/site.manifest.expectations.json" assert {
  type: "json",
};
import schema from "./contracts/site.manifest.schema.json" assert {
  type: "json",
};

type Expectations = {
  siteUrl?: string;
  buildMode?: string;
  requiredPaths?: string[];
  homepageRequiredLinks?: string[];
  jsonLdRequiredPaths?: string[];
};

const runBuild = async () => {
  const command = new Deno.Command(Deno.execPath(), {
    args: ["task", "build:site"],
  });
  const result = await command.output();
  if (result.code !== 0) {
    const decoder = new TextDecoder();
    const stdout = decoder.decode(result.stdout);
    const stderr = decoder.decode(result.stderr);
    throw new Error(
      `Build failed (code ${result.code}).\n${stdout}\n${stderr}`.trim(),
    );
  }
};

const assertPathsPresent = (paths: Set<string>, required: string[]) => {
  for (const path of required) {
    assert(paths.has(path), `Missing required page: ${path}`);
  }
};

const assertLinksResolve = (paths: Set<string>, links: string[]) => {
  for (const link of links) {
    assert(paths.has(link), `Unresolved internal link: ${link}`);
  }
};

Deno.test("site manifest contract", async () => {
  await runBuild();
  const manifest = await generateSiteManifest({ siteDir: "_site" });

  await Deno.writeTextFile(
    "_site/site.manifest.json",
    JSON.stringify(manifest, null, 2),
  );

  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);
  const isValid = validate(manifest);
  if (!isValid) {
    throw new Error(
      `Manifest schema validation failed: ${ajv.errorsText(validate.errors)}`,
    );
  }

  const typedExpectations = expectations as Expectations;
  const siteUrl = typedExpectations.siteUrl;
  const buildMode = typedExpectations.buildMode;
  const requiredPaths = typedExpectations.requiredPaths ?? [];
  const homepageRequiredLinks = typedExpectations.homepageRequiredLinks ?? [];
  const jsonLdRequiredPaths = typedExpectations.jsonLdRequiredPaths ?? [];

  if (siteUrl) {
    assertEquals(manifest.site.url, siteUrl);
  }

  if (buildMode) {
    assertEquals(manifest.site.buildMode, buildMode);
  }

  const paths = new Set(manifest.pages.map((page) => page.path));
  assertPathsPresent(paths, requiredPaths);

  for (const page of manifest.pages) {
    assertLinksResolve(paths, page.links);
    assertEquals(
      page.canonical,
      `${manifest.site.url}${page.path}`,
      `Canonical mismatch for ${page.path}`,
    );
    assert(
      page.jsonLdErrors.length === 0,
      `Invalid JSON-LD on ${page.path}: ${page.jsonLdErrors.join("; ")}`,
    );
  }

  if (homepageRequiredLinks.length > 0) {
    const home = manifest.pages.find((page) => page.path === "/");
    assert(home, "Homepage manifest entry missing");
    for (const link of homepageRequiredLinks) {
      assert(
        home.links.includes(link),
        `Homepage missing required link: ${link}`,
      );
    }
  }

  for (const path of jsonLdRequiredPaths) {
    const page = manifest.pages.find((entry) => entry.path === path);
    assert(page, `Missing JSON-LD required page: ${path}`);
    assert(page.hasJsonLd, `Missing JSON-LD on ${path}`);
  }
});
import Ajv from "npm:ajv";
import addFormats from "npm:ajv-formats";
import site from "../lume.config.ts";

const readJson = async (path: string) =>
  JSON.parse(await Deno.readTextFile(path));

Deno.test("site manifest matches schema and invariants", async () => {
  await site.build();

  const schema = await readJson(
    new URL("../site.manifest.schema.json", import.meta.url).pathname,
  );
  const manifestPath = site.dest("site.manifest.json");
  const manifest = await readJson(manifestPath);

  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (!validate(manifest)) {
    throw new Error(ajv.errorsText(validate.errors, { separator: "\n" }));
  }

  for (const page of manifest.pages) {
    if (page.forbidden.lumeLiveReload) {
      throw new Error(`Forbidden live reload script on ${page.url}`);
    }
    if (page.forbidden.lumeBar) {
      throw new Error(`Forbidden lume bar element on ${page.url}`);
    }
    if (!page.title) {
      throw new Error(`Missing title on ${page.url}`);
    }
    if (!page.h1) {
      throw new Error(`Missing h1 on ${page.url}`);
    }
    if (!page.canonical) {
      throw new Error(`Missing canonical link on ${page.url}`);
    }
  }
});
