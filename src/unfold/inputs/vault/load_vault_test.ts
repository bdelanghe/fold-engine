import { assertEquals } from "@std/assert";
import {
  ACCEPTED_EXTENSIONS,
  loadVaultRoot,
  scanVault,
  validateVault,
} from "./load_vault.ts";

Deno.test("loadVaultRoot returns valid URL", () => {
  const root = loadVaultRoot();
  assertEquals(root.protocol, "file:");
  assertEquals(root.pathname.endsWith("obsidian_vault/"), true);
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

Deno.test("validateVault passes for valid vault", async () => {
  const errors = await validateVault();
  assertEquals(errors.length, 0, `Unexpected errors: ${errors.join(", ")}`);
});
