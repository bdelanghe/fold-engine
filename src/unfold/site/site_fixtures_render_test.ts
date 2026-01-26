import { assert } from "@std/assert";
import { dirname, fromFileUrl, join, relative } from "@std/path";
import { createSite } from "./site.ts";

const hasRequiredPermissions = async (): Promise<boolean> => {
  const required: Deno.PermissionDescriptor[] = [
    { name: "read" },
    { name: "write" },
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

const copyFixture = async (source: string, destination: string) => {
  await Deno.mkdir(dirname(destination), { recursive: true });
  await Deno.copyFile(source, destination);
};

const resolveFixture = (relativePath: string) =>
  fromFileUrl(new URL(relativePath, import.meta.url));

Deno.test("site build renders WebSite and WebPage fixtures", async () => {
  if (!await hasRequiredPermissions()) {
    console.warn("Skipping fixture site build test (missing permissions).");
    return;
  }

  const workspaceRoot = Deno.cwd();
  const tempVaultDir = await Deno.makeTempDir({ dir: workspaceRoot });
  const tempOutDir = await Deno.makeTempDir({ dir: workspaceRoot });
  const relativeOutDir = relative(workspaceRoot, tempOutDir);

  const websiteFixture = resolveFixture("../contracts/website.fixture.jsonld");
  const webpageFixture = resolveFixture("../contracts/webpage.fixture.jsonld");

  await copyFixture(websiteFixture, join(tempVaultDir, "site.jsonld"));
  await copyFixture(
    webpageFixture,
    join(tempVaultDir, "pages", "hello.jsonld"),
  );

  const env = {
    VAULT_PATH: Deno.env.get("VAULT_PATH"),
    SITE_OUTPUT_DIR: Deno.env.get("SITE_OUTPUT_DIR"),
    SITE_URL: Deno.env.get("SITE_URL"),
  };

  try {
    Deno.env.set("VAULT_PATH", tempVaultDir);
    Deno.env.set("SITE_OUTPUT_DIR", relativeOutDir);
    Deno.env.set("SITE_URL", "https://example.org");

    const site = createSite();
    await site.build();

    const rootIndex = join(tempOutDir, "index.html");
    await Deno.stat(rootIndex);

    const helloDirIndex = join(tempOutDir, "pages", "hello", "index.html");
    const helloHtml = join(tempOutDir, "pages", "hello.html");
    const helloPlain = join(tempOutDir, "pages", "hello");
    const helloExists = await Promise.allSettled([
      Deno.stat(helloDirIndex),
      Deno.stat(helloHtml),
      Deno.stat(helloPlain),
    ]);
    assert(
      helloExists.some((result) => result.status === "fulfilled"),
      "Expected WebPage fixture output for /pages/hello",
    );
  } finally {
    if (env.VAULT_PATH === undefined) {
      Deno.env.delete("VAULT_PATH");
    } else {
      Deno.env.set("VAULT_PATH", env.VAULT_PATH);
    }
    if (env.SITE_OUTPUT_DIR === undefined) {
      Deno.env.delete("SITE_OUTPUT_DIR");
    } else {
      Deno.env.set("SITE_OUTPUT_DIR", env.SITE_OUTPUT_DIR);
    }
    if (env.SITE_URL === undefined) {
      Deno.env.delete("SITE_URL");
    } else {
      Deno.env.set("SITE_URL", env.SITE_URL);
    }
  }
});
