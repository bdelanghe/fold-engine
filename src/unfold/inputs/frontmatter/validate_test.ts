import { assertEquals } from "@std/assert";
import { validateNoteContent } from "./validate.ts";

const validNote = `---
title: Test Note
jsonld: '{"@context":"https://schema.org/"}'
---

Hello world.
`;

Deno.test("validateNoteContent passes valid note", () => {
  const errors = validateNoteContent("/notes/test.md", validNote);
  assertEquals(errors.length, 0);
});

Deno.test("validateNoteContent reports missing title", () => {
  const invalid = `---
jsonld: '{"@context":"https://schema.org/"}'
---

Hello.
`;
  const errors = validateNoteContent("/notes/invalid.md", invalid);
  assertEquals(errors.length, 1);
});

Deno.test("validateNoteContent reports invalid fence language", () => {
  const invalid = `---
title: Bad Fence
jsonld: '{"@context":"https://schema.org/"}'
---

\`\`\`python
print("nope")
\`\`\`
`;
  const errors = validateNoteContent("/notes/fence.md", invalid);
  assertEquals(errors.length, 1);
});

Deno.test("validateNoteContent reports invalid frontmatter", () => {
  const invalid = `---
title: Broken
jsonld: '{"@context":"https://schema.org/"}'
`;
  const errors = validateNoteContent("/notes/frontmatter.md", invalid);
  assertEquals(errors.length, 1);
  assertEquals(errors[0].includes("frontmatter: invalid"), true);
});

Deno.test("validateNoteContent accepts schema.org page metadata", () => {
  const note = `---
title: Schema Page
schema:
  pageType: WebPage
  pageSubtypes:
    - NoteDigitalDocument
  about:
    - type: SoftwareSourceCode
      id: https://github.com/bdelanghe/fold-engine
jsonld: '{"@context":"https://schema.org/"}'
---

Hello schema.
`;
  const errors = validateNoteContent("/notes/schema.md", note);
  assertEquals(errors.length, 0);
});

Deno.test("validateNoteContent rejects schema.org about id without url", () => {
  const note = `---
title: Schema Page
schema:
  pageType: WebPage
  about:
    - type: SoftwareSourceCode
      id: not-a-url
jsonld: '{"@context":"https://schema.org/"}'
---

Hello schema.
`;
  const errors = validateNoteContent("/notes/schema.md", note);
  assertEquals(errors.length, 1);
});
