# Zod Schemas

Type-safe schema definitions for JSON-LD objects.

## Why Zod?

**Zod → JSON Schema** workflow instead of maintaining separate JSON Schemas:

1. **Type-safe** - TypeScript types inferred from schemas
2. **Runtime validation** - Zod provides excellent error messages
3. **Single source of truth** - Define once, use everywhere
4. **Can generate JSON Schema** - For external tools/documentation

## Architecture

```
Zod Schema (TypeScript)
  ↓ (z.infer)
TypeScript Type
  ↓ (runtime)
Validation + Error Messages
  ↓ (optional)
JSON Schema (for external tools)
```

## Schemas

### Page

```typescript
import { type Page, PageSchema } from "./page.ts";

const page: Page = {
  "@type": "basis:Page",
  "@id": "https://example.org/pages/test",
  "title": "Test Page",
};

PageSchema.parse(page); // validates at runtime
```

### Reference

```typescript
import { type Reference, ReferenceSchema } from "./reference.ts";

const ref: Reference = {
  "@type": "basis:Reference",
  "@id": "https://example.org/refs/test",
  "title": "Test Reference",
  "url": "https://example.com",
};
```

### Concept

```typescript
import { type Concept, ConceptSchema } from "./concept.ts";

const concept: Concept = {
  "@id": "https://example.org/vocab/basis#Test",
  "@type": "skos:Concept",
  "label": "Test",
};
```

## Schema Registry

Get schema by @type:

```typescript
import { getSchemaForType } from "./mod.ts";

const schema = getSchemaForType("basis:Page");
const result = schema?.parse(node);
```

## Generating JSON Schema

Future: Use `zod-to-json-schema` or similar to generate JSON Schema for:

- External documentation
- API contracts
- Non-TypeScript tools

## Validation

See `validator_zod.ts` for usage with vault nodes.

All 9 validation tests passing.
