import { assertEquals } from "@std/assert";
import { isAbsolute, join, toFileUrl } from "@std/path";
import {
  ACCEPTED_EXTENSIONS,
  loadVaultRoot,
  scanVault,
  validateVault,
} from "./load_vault.ts";

const hasVaultFixture = async (): Promise<boolean> => {
  const manifest = await scanVault();
  if (!manifest.hasConfig || manifest.files.length === 0) {
    console.warn("Skipping vault tests (missing vault content).");
    return false;
  }
  return true;
};

Deno.test("loadVaultRoot returns valid URL", () => {
  const root = loadVaultRoot();
  assertEquals(root.protocol, "file:");
  const override = Deno.env.get("VAULT_PATH")?.trim();
  if (override) {
    const resolved = isAbsolute(override) ? override : join(Deno.cwd(), override);
    const expected = toFileUrl(
      resolved.endsWith("/") ? resolved : `${resolved}/`,
    );
    assertEquals(root.pathname, expected.pathname);
  } else {
    const defaultVault = join(Deno.cwd(), "vault");
    let expectedSuffix = "/";
    try {
      const stat = await Deno.stat(defaultVault);
      if (stat.isDirectory) {
        expectedSuffix = "/vault/";
      }
    } catch {
      // Fall through to repo root.
    }
    assertEquals(root.pathname.endsWith(expectedSuffix), true);
  }
});

Deno.test("ACCEPTED_EXTENSIONS includes all Obsidian types", () => {
  assertEquals(ACCEPTED_EXTENSIONS.markdown.has(".md"), true);
  assertEquals(ACCEPTED_EXTENSIONS.canvas.has(".canvas"), true);
  assertEquals(ACCEPTED_EXTENSIONS.image.has(".png"), true);
  assertEquals(ACCEPTED_EXTENSIONS.audio.has(".mp3"), true);
  assertEquals(ACCEPTED_EXTENSIONS.video.has(".mp4"), true);
  assertEquals(ACCEPTED_EXTENSIONS.pdf.has(".pdf"), true);
});

Deno.test("scanVault produces valid manifest", async () => {
  if (!await hasVaultFixture()) {
    return;
  }
  const manifest = await scanVault();

  assertEquals(typeof manifest.root, "string");
  assertEquals(manifest.hasConfig, true);
  assertEquals(Array.isArray(manifest.files), true);
  assertEquals(Array.isArray(manifest.invalidFiles), true);

  // Should have markdown files
  const mdFiles = manifest.files.filter((f) => f.type === "markdown");
  assertEquals(mdFiles.length > 0, true);

  // All files should have required properties
  for (const file of manifest.files) {
    assertEquals(typeof file.path, "string");
    assertEquals(typeof file.type, "string");
    assertEquals(typeof file.extension, "string");
  }
});

Deno.test("scanVault ignores _includes templates", async () => {
  if (!await hasVaultFixture()) {
    return;
  }
  const manifest = await scanVault();
  const includesInvalid = manifest.invalidFiles.some((file) =>
    file.path.startsWith("_includes/")
  );
  assertEquals(includesInvalid, false);
});

Deno.test("validateVault passes for valid vault", async () => {
  if (!await hasVaultFixture()) {
    return;
  }
  const errors = await validateVault();
  assertEquals(errors.length, 0, `Unexpected errors: ${errors.join(", ")}`);
});
