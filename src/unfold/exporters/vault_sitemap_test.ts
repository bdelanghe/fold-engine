import { assert, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { updateVaultSitemap } from "./vault_sitemap.ts";

const writeWarning = (message: string): void => {
  const encoder = new TextEncoder();
  void Deno.stderr.write(encoder.encode(`${message}\n`));
};

const hasPermissions = async (
  permissions: Deno.PermissionName[],
): Promise<boolean> => {
  for (const permission of permissions) {
    const status = await Deno.permissions.query({ name: permission });
    if (status.state !== "granted") {
      return false;
    }
  }
  return true;
};

const withEnv = async (
  next: Record<string, string>,
  run: () => Promise<void>,
): Promise<void> => {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(next)) {
    previous[key] = Deno.env.get(key);
    Deno.env.set(key, value);
  }
  try {
    await run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, value);
      }
    }
  }
};

Deno.test("updateVaultSitemap rewrites legacy fold-engine paths", async () => {
  const allowed = await hasPermissions(["env", "read", "write"]);
  if (!allowed) {
    writeWarning("Skipping vault sitemap test (missing permissions).");
    return;
  }
  const tempDir = await Deno.makeTempDir();
  const siteDir = join(tempDir, "site");
  const vaultDir = join(tempDir, "vault");
  await Deno.mkdir(siteDir, { recursive: true });
  await Deno.mkdir(vaultDir, { recursive: true });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://bdelanghe.github.io/fold-engine/</loc>
    <lastmod>2026-01-25T03:18:27.989Z</lastmod>
  </url>
  <url>
    <loc>https://bdelanghe.github.io/fold-engine/about/</loc>
    <lastmod>2026-01-25T03:18:27.989Z</lastmod>
  </url>
</urlset>
`;
  await Deno.writeTextFile(join(siteDir, "sitemap.xml"), xml);

  const existing = `---
title: Fold Engine Sitemap
---

# Fold Engine Sitemap

## Vault index

- [[about.md]]

| Page | Last modified |
| --- | --- |
| [fold-engine](https://bdelanghe.github.io/fold-engine/) | 2026-01-25T03:18:27.989Z |
`;
  const outputPath = join(vaultDir, "sitemap.md");
  await Deno.writeTextFile(outputPath, existing);

  await withEnv(
    {
      SITE_OUTPUT_DIR: siteDir,
      VAULT_PATH: vaultDir,
      SITE_URL: "https://unfold.robertdelanghe.com",
    },
    async () => {
      await updateVaultSitemap();
    },
  );

  const updated = await Deno.readTextFile(outputPath);
  assertStringIncludes(updated, "## Vault index");
  assertStringIncludes(updated, "https://unfold.robertdelanghe.com/");
  assertStringIncludes(updated, "https://unfold.robertdelanghe.com/about/");
  assert(!updated.includes("/fold-engine/"));
});
