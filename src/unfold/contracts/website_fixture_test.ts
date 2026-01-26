import { Ajv } from "ajv";
import addFormatsModule from "ajv-formats";
import type { FormatsPlugin } from "ajv-formats";
import { assert } from "@std/assert";
import schema from "../schemas/website.schema.json" with {
  type: "json",
};

Deno.test("website fixture matches WebSite schema", async () => {
  const fixturePath = new URL("./website.fixture.jsonld", import.meta.url)
    .pathname;
  const readStatus = await Deno.permissions.query({
    name: "read",
    path: fixturePath,
  });
  if (readStatus.state !== "granted") {
    console.warn("Skipping website fixture test (missing read permission).");
    return;
  }
  const content = await Deno.readTextFile(fixturePath);
  const data = JSON.parse(content);

  const ajv = new Ajv({ allErrors: true, strict: false });
  const addFormats = addFormatsModule as unknown as FormatsPlugin;
  addFormats(ajv);

  const validate = ajv.compile(schema);
  const valid = validate(data);
  if (!valid) {
    throw new Error(ajv.errorsText(validate.errors, { separator: "\n" }));
  }

  assert(valid);
});
