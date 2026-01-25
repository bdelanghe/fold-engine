import { Ajv } from "ajv";
import addFormatsModule from "ajv-formats";
import type { FormatsPlugin } from "ajv-formats";
import { assert, assertEquals } from "@std/assert";
import { generateSiteManifest } from "../manifests/site_manifest.ts";
import expectations from "../contracts/site.manifest.expectations.json" with {
  type: "json",
};
import contractSchema from "../schemas/site.manifest.contract.schema.json" with {
  type: "json",
};
import siteSchema from "../schemas/site.manifest.schema.json" with {
  type: "json",
};
import { scanVault } from "../inputs/vault/load_vault.ts";

type Expectations = {
  siteUrl?: string;
  buildMode?: string;
  requiredPaths?: string[];
  homepageRequiredLinks?: string[];
  jsonLdRequiredPaths?: string[];
};

type SiteManifestForTest = {
  pages: Array<{
    forbidden: {
      lumeLiveReload: boolean;
      lumeBar: boolean;
    };
    url: string;
    title: string;
    h1: string;
    canonical: string;
  }>;
};

const hasRequiredPermissions = async (): Promise<boolean> => {
  const required: Deno.PermissionDescriptor[] = [
    { name: "read" },
    { name: "write" },
    { name: "run" },
    { name: "env" },
  ];
  for (const permission of required) {
    const status = await Deno.permissions.query(permission);
    if (status.state !== "granted") {
      return false;
    }
  }
  return true;
};

const hasVaultContent = async (): Promise<boolean> => {
  const manifest = await scanVault();
  if (!manifest.hasConfig || manifest.files.length === 0) {
    console.warn("Skipping site manifest (missing vault content).");
    return false;
  }
  return true;
};

const loadSite = async () => (await import("../site/site.ts")).createSite();

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

const getSiteDir = (): string =>
  Deno.env.get("SITE_OUTPUT_DIR")?.trim() || ".unfold/site";

Deno.test("site manifest contract", async () => {
  if (!await hasRequiredPermissions()) {
    console.warn("Skipping site manifest contract (missing permissions).");
    return;
  }
  if (!await hasVaultContent()) {
    return;
  }
  await runBuild();
  const siteDir = getSiteDir();
  const manifest = await generateSiteManifest({ siteDir });

  await Deno.writeTextFile(
    `${siteDir.replace(/\/$/, "")}/site.manifest.json`,
    JSON.stringify(manifest, null, 2),
  );

  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(contractSchema);
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

Deno.test("site manifest matches schema and invariants", async () => {
  if (!await hasRequiredPermissions()) {
    console.warn("Skipping site manifest invariants (missing permissions).");
    return;
  }
  if (!await hasVaultContent()) {
    return;
  }
  const site = await loadSite();
  await site.build();

  const manifestPath = site.dest("site.manifest.json");
  const manifest = JSON.parse(
    await Deno.readTextFile(manifestPath),
  ) as SiteManifestForTest;

  const ajv = new Ajv({ allErrors: true });
  const addFormats = addFormatsModule as unknown as FormatsPlugin;
  addFormats(ajv);
  const validate = ajv.compile(siteSchema);
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

Deno.test("healthz file is generated", async () => {
  if (!await hasRequiredPermissions()) {
    console.warn("Skipping healthz file check (missing permissions).");
    return;
  }
  if (!await hasVaultContent()) {
    return;
  }
  const site = await loadSite();
  await site.build();

  const healthPath = site.dest("healthz");
  const healthContents = await Deno.readTextFile(healthPath);
  assertEquals(healthContents.trim(), "ok");
});
