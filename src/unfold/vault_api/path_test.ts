import { assertEquals, assertThrows } from "@std/assert";
import { encodeVaultPath, sanitizeVaultPath } from "./path.ts";

Deno.test("sanitizeVaultPath allows normal relative paths", () => {
  assertEquals(sanitizeVaultPath("notes/hello.md"), "notes/hello.md");
});

Deno.test("sanitizeVaultPath allows .obsidian paths", () => {
  assertEquals(
    sanitizeVaultPath(".obsidian/config.json"),
    ".obsidian/config.json",
  );
});

Deno.test("sanitizeVaultPath rejects traversal", () => {
  assertThrows(() => sanitizeVaultPath("../secret.md"));
  assertThrows(() => sanitizeVaultPath("notes/../secret.md"));
});

Deno.test("sanitizeVaultPath rejects absolute paths", () => {
  assertThrows(() => sanitizeVaultPath("/etc/passwd"));
});

Deno.test("encodeVaultPath encodes segments", () => {
  assertEquals(encodeVaultPath("notes/hello world.md"), "notes/hello%20world.md");
});
