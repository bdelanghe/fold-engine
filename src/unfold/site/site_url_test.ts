import { assertEquals } from "@std/assert";
import { normalizeSiteUrl } from "./site_url.ts";

Deno.test("normalizeSiteUrl strips fold-engine prefix", () => {
  assertEquals(
    normalizeSiteUrl("https://unfold.robertdelanghe.com/fold-engine"),
    "https://unfold.robertdelanghe.com",
  );
  assertEquals(
    normalizeSiteUrl("https://unfold.robertdelanghe.com/fold-engine/"),
    "https://unfold.robertdelanghe.com",
  );
});

Deno.test("normalizeSiteUrl keeps clean URLs", () => {
  assertEquals(
    normalizeSiteUrl("https://unfold.robertdelanghe.com"),
    "https://unfold.robertdelanghe.com",
  );
});
