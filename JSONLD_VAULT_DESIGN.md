# JSON-LD Vault Architecture

**Issue:** bdelanghe-nke (P0 - Foundation)

## Overview

Instead of using Obsidian markdown as the vault source, the system will use
**native JSON-LD objects** as the single source of truth. This "JSON-LD first"
approach simplifies the pipeline and enables direct graph operations.

## Architectural Change

### Before (Obsidian-based)

```
vault/
  ├── pages/
  │   └── cognitive-folding.md (markdown + YAML frontmatter)
  ├── refs/
  │   └── WAI-ARIA.md (markdown + YAML frontmatter)
  └── vocab/
      └── basis__Fold.md (markdown + YAML frontmatter)
        ↓ (parse markdown)
        ↓ (extract frontmatter)
        ↓ (convert to JSON-LD)
        ↓
      JSON-LD objects → validation → rendering → exports
```

### After (JSON-LD native)

```
vault/
  ├── pages/
  │   └── cognitive-folding.jsonld
  ├── refs/
  │   └── WAI-ARIA.jsonld
  └── vocab/
      └── basis__Fold.jsonld
        ↓ (load JSON-LD directly)
        ↓
      JSON-LD objects → validation → rendering → exports
```

## Benefits

1. **Simpler Pipeline**
   - No markdown parsing
   - No frontmatter extraction
   - No markdown→JSON-LD conversion
   - Direct JSON schema validation

2. **Native @id Resolution**
   - Links are already IRIs
   - No `[[wikilink]]` resolution needed
   - Direct graph traversal

3. **Deterministic Validation**
   - JSON schema validation first
   - Then graph validation
   - Clear error messages

4. **Standard Tooling**
   - Any JSON-LD tool can read the vault
   - Standard JSON editors work
   - JSON-LD playground for testing

5. **LDP-Ready**
   - Files are already LDP resources
   - HTTP CRUD maps directly to file operations
   - PATCH can use JSON Patch or LD Patch

## Vault Structure

### Directory Layout

```
vault/
├── catalog.jsonld              # DCAT catalog (entrypoint)
├── pages/                       # Article/page objects
│   ├── cognitive-folding.jsonld
│   ├── basis-framework.jsonld
│   └── index.jsonld
├── refs/                        # Citation/reference objects
│   ├── WAI-ARIA.jsonld
│   ├── schema-org.jsonld
│   └── json-ld-spec.jsonld
├── vocab/                       # Vocabulary/term definitions
│   ├── basis.jsonld            # The full basis vocabulary
│   └── custom-terms.jsonld
└── @context/                    # Shared JSON-LD contexts
    ├── default.jsonld
    └── basis.jsonld
```

### File Naming Convention

**Pages:** `pages/<slug>.jsonld`

- Example: `pages/cognitive-folding.jsonld`
- @id: `https://site/pages/cognitive-folding`

**Refs:** `refs/<slug>.jsonld`

- Example: `refs/wai-aria.jsonld`
- @id: `https://site/refs/wai-aria`

**Vocab terms:** `vocab/<vocab-name>.jsonld`

- Example: `vocab/basis.jsonld`
- Contains multiple terms with hash URIs
- @id: `https://site/vocab/basis#Fold`, `#Unfold`, etc.

## JSON-LD Object Schema

### Minimal Page Object

```jsonld
{
  "@context": "https://site/@context/default.jsonld",
  "@type": "basis:Page",
  "@id": "https://site/pages/cognitive-folding",
  "title": "Cognitive Folding",
  "description": "An exploration of the folding metaphor in cognition",
  "hasPart": [
    { "@id": "https://site/pages/cognitive-folding#introduction" },
    { "@id": "https://site/pages/cognitive-folding#framework" }
  ],
  "dateCreated": "2026-01-25",
  "dateModified": "2026-01-25"
}
```

### Section Object (embedded or separate)

```jsonld
{
  "@id": "https://site/pages/cognitive-folding#introduction",
  "@type": "basis:Section",
  "title": "Introduction",
  "content": {
    "@type": "Text",
    "@value": "This section introduces the concept..."
  },
  "isPartOf": { "@id": "https://site/pages/cognitive-folding" }
}
```

### Reference Object

```jsonld
{
  "@context": "https://site/@context/default.jsonld",
  "@type": "basis:Reference",
  "@id": "https://site/refs/wai-aria",
  "title": "WAI-ARIA Authoring Practices Guide",
  "url": "https://www.w3.org/WAI/ARIA/apg/",
  "author": "W3C",
  "dateAccessed": "2026-01-25",
  "description": "Guidelines for accessible web components"
}
```

### Vocabulary Term

```jsonld
{
  "@context": "https://site/@context/basis.jsonld",
  "@id": "https://site/vocab/basis#Fold",
  "@type": ["rdfs:Class", "basis:Concept"],
  "rdfs:label": "Fold",
  "skos:definition": "A transformation that preserves structure while reducing dimensionality",
  "skos:broader": { "@id": "https://site/vocab/basis#Transform" },
  "skos:related": [
    { "@id": "https://site/vocab/basis#Unfold" },
    { "@id": "https://site/vocab/basis#Projection" }
  ]
}
```

## Context Strategy

### Shared Contexts

Place common context definitions in `vault/@context/`:

**`@context/default.jsonld`:**

```jsonld
{
  "@context": {
    "basis": "https://site/vocab/basis#",
    "schema": "https://schema.org/",
    "skos": "http://www.w3.org/2004/02/skos/core#",
    "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
    "title": "schema:name",
    "description": "schema:description",
    "dateCreated": "schema:dateCreated",
    "dateModified": "schema:dateModified",
    "hasPart": "schema:hasPart",
    "isPartOf": "schema:isPartOf",
    "content": "schema:text"
  }
}
```

### Inline vs Reference

**Small objects:** Inline context

```jsonld
{
  "@context": {
    "title": "schema:name",
    "basis": "https://site/vocab/basis#"
  },
  "@id": "https://site/pages/example",
  "title": "Example"
}
```

**Large objects:** Reference shared context

```jsonld
{
  "@context": "https://site/@context/default.jsonld",
  "@id": "https://site/pages/example",
  "title": "Example"
}
```

## Pipeline Changes

### Current Pipeline (Obsidian)

```
src/unfold/
├── inputs/
│   ├── vault/          # Read Obsidian vault
│   ├── markdown/       # Parse markdown
│   └── frontmatter/    # Extract YAML
├── pipeline/
│   ├── validate.ts     # Validate frontmatter schemas
│   ├── render.ts       # Convert MD → HTML
│   └── export.ts       # Export JSON-LD
```

### New Pipeline (JSON-LD)

```
src/unfold/
├── inputs/
│   └── jsonld/         # Read JSON-LD vault
├── graph/              # NEW: Graph operations
│   ├── loader.ts       # Load all .jsonld files
│   ├── uris.ts         # Cool URI normalization
│   ├── resolver.ts     # @id resolution
│   ├── validator.ts    # Graph validation
│   └── reachability.ts # Orphan detection
├── pipeline/
│   ├── validate.ts     # JSON + graph validation
│   ├── render.ts       # JSON-LD → HTML (via templates)
│   └── export.ts       # Export catalogs/graphs
```

## Implementation Tasks

### 1. Create `src/unfold/inputs/jsonld/` module

**`loader.ts`** - Load all JSON-LD files

```typescript
export async function loadVault(vaultPath: string): Promise<Node[]> {
  const files = await glob(`${vaultPath}/**/*.jsonld`);
  const nodes: Node[] = [];
  for (const file of files) {
    const content = await Deno.readTextFile(file);
    const parsed = JSON.parse(content);
    // Handle @graph, arrays, single objects
    nodes.push(...extractNodes(parsed));
  }
  return nodes;
}
```

**`schema.ts`** - JSON Schema validation

```typescript
import Ajv from "ajv";

export function validateNode(node: unknown): Node {
  const ajv = new Ajv();
  const schema = loadSchema(node["@type"]);
  const valid = ajv.validate(schema, node);
  if (!valid) {
    throw new ValidationError(ajv.errors);
  }
  return node as Node;
}
```

### 2. Update `pipeline/validate.ts`

```typescript
import { loadVault } from "../inputs/jsonld/loader.ts";
import { validateGraph } from "../graph/validator.ts";

export async function runValidate(): Promise<void> {
  // Load JSON-LD vault
  const nodes = await loadVault(getVaultPath());

  // JSON Schema validation
  for (const node of nodes) {
    validateNode(node);
  }

  // Graph validation (I1-I5)
  await validateGraph(nodes);
}
```

### 3. Create `src/unfold/graph/` module

See LINKED_DATA_ARCHITECTURE.md for detailed specs:

- `uris.ts` - Cool URI patterns
- `resolver.ts` - @id resolution
- `validator.ts` - Graph invariants
- `reachability.ts` - BFS/DFS

### 4. Update `pipeline/render.ts`

Instead of markdown→HTML:

```typescript
export async function runRender(): Promise<void> {
  const nodes = await loadVault(getVaultPath());

  for (const node of nodes) {
    if (node["@type"] === "basis:Page") {
      const html = renderPage(node);
      await writeHTML(`dist/${getSlug(node["@id"])}.html`, html);
    }
  }
}
```

### 5. Template Strategy

Use Lume templates with JSON-LD data:

**`templates/page.tmpl.ts`:**

```typescript
export default (data: PageNode) => `
  <!DOCTYPE html>
  <html>
    <head>
      <title>${data.title}</title>
      <script type="application/ld+json">
        ${JSON.stringify(data, null, 2)}
      </script>
    </head>
    <body>
      <h1>${data.title}</h1>
      <p>${data.description}</p>
      ${renderContent(data.content)}
    </body>
  </html>
`;
```

## Migration Path

### Option A: Hard Cut (Recommended)

1. Create new empty vault with JSON-LD structure
2. Implement loader + validation
3. Add example JSON-LD files
4. Build and test
5. Expand from there

**Pros:** Clean start, no legacy code **Cons:** No existing content to test with

### Option B: Dual Mode (Complex)

1. Support both Obsidian and JSON-LD vaults
2. Add converter: Obsidian → JSON-LD
3. Gradually migrate content

**Pros:** Preserves existing content **Cons:** Maintains two pipelines

**Recommendation:** Option A (hard cut) - start clean with JSON-LD.

## Example Vault

Create `vault/` with minimal example:

### `vault/catalog.jsonld`

```jsonld
{
  "@context": "https://www.w3.org/ns/dcat",
  "@type": "Catalog",
  "@id": "https://site/catalog",
  "title": "Fold Engine Knowledge Graph",
  "dataset": [
    { "@id": "https://site/pages/" },
    { "@id": "https://site/refs/" },
    { "@id": "https://site/vocab/basis" }
  ]
}
```

### `vault/pages/hello.jsonld`

```jsonld
{
  "@context": "https://site/@context/default.jsonld",
  "@type": "basis:Page",
  "@id": "https://site/pages/hello",
  "title": "Hello World",
  "description": "A minimal JSON-LD page",
  "dateCreated": "2026-01-25"
}
```

### `vault/@context/default.jsonld`

```jsonld
{
  "@context": {
    "basis": "https://site/vocab/basis#",
    "schema": "https://schema.org/",
    "title": "schema:name",
    "description": "schema:description",
    "dateCreated": "schema:dateCreated"
  }
}
```

## Testing

### Unit Tests

```typescript
Deno.test("loadVault loads all .jsonld files", async () => {
  const nodes = await loadVault("./fixtures/vault");
  assertEquals(nodes.length, 3);
  assert(nodes.every((n) => n["@id"]));
});

Deno.test("validateNode rejects invalid JSON-LD", () => {
  assertThrows(() => {
    validateNode({ "title": "No @id" });
  }, ValidationError);
});
```

### Integration Tests

```typescript
Deno.test("pipeline validates and renders vault", async () => {
  await runValidate(); // Should not throw
  await runRender(); // Should generate HTML
  assert(await exists("dist/pages/hello.html"));
});
```

## Success Criteria

✅ JSON-LD vault structure defined ✅ Loader reads all `.jsonld` files ✅ JSON
Schema validation enforced ✅ Graph validation works on JSON-LD objects ✅
Rendering produces HTML from JSON-LD ✅ Example vault builds successfully ✅ All
tests passing ✅ Documentation updated

## Next Steps

After this foundation is complete:

1. bdelanghe-9lu - Cool URIs (native to JSON-LD)
2. bdelanghe-1kw - Link resolver (just @id lookup)
3. bdelanghe-xkc - Graph validation (I1-I5)
4. bdelanghe-zdl - DCAT catalog (already JSON-LD!)

This architectural change makes all subsequent work simpler and more
standard-compliant.
