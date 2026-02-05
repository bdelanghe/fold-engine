# JSON-LD Input Module

This module loads and validates JSON-LD objects from the vault.

## Architecture

### JSON-LD First, Schema Validated

The vault contains native JSON-LD objects (`.jsonld` files). This module:

1. **Loads** all `.jsonld` files from the vault
2. **Extracts** nodes (handling `@graph`, arrays, single objects)
3. **Validates** structure using Zod schemas
4. **Validates** graph semantics with SHACL-style shapes

### Complementary Validation

**Zod** provides:

- Structural validation (required fields, types, formats)
- TypeScript type inference

**JSON-LD** provides:

- Identity (`@id` must be unique IRI)
- Typing (`@type` specifies RDF class)
- Context (`@context` defines term mappings)

### Semantic Annotations

Schemas include `x-jsonld-*` keywords to bridge structure and semantics:

```json
{
  "properties": {
    "@id": {
      "type": "string",
      "format": "uri",
      "x-jsonld-id": true
    },
    "title": {
      "type": "string",
      "x-jsonld-term": "schema:name"
    },
    "dateCreated": {
      "type": "string",
      "format": "date",
      "x-jsonld-term": "schema:dateCreated",
      "x-jsonld-datatype": "xsd:date"
    },
    "hasPart": {
      "type": "array",
      "x-jsonld-term": "schema:hasPart",
      "x-jsonld-container": "@set"
    }
  }
}
```

These annotations:

- Document the semantic layer
- Can generate `@context` definitions
- Enable schema-driven tools while preserving JSON-LD meaning

## Usage

### Load Vault

```typescript
import { loadVault } from "./loader.ts";

const { nodes, errors } = await loadVault("./vault");

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`${error.file}: ${error.message}`);
  }
}

console.log(`Loaded ${nodes.length} nodes`);
```

### Validate Nodes (Zod)

```typescript
import { validateNodes } from "./validator_zod.ts";

const errors = await validateNodes(nodes);

if (errors.length > 0) {
  throw new Error(`Zod validation failed with ${errors.length} errors`);
}
```

### Extract Semantic Annotations

```typescript
import { extractSemanticAnnotations } from "./validator.ts";

const schema = await loadSchema("page.schema.json");
const context = extractSemanticAnnotations(schema);

// context = { "title": "schema:name", "dateCreated": { "@id": "schema:dateCreated", "@type": "xsd:date" }, ... }
```

## File Types

### VaultNode

A JSON-LD node with source metadata:

```typescript
interface VaultNode extends JsonLdNode {
  _source?: {
    file: string;
    path: string;
  };
}
```

### LoadResult

Result of loading the vault:

```typescript
interface LoadResult {
  nodes: VaultNode[];
  errors: ValidationError[];
}
```

## Error Handling

The loader is designed to be fault-tolerant:

- Parse errors are collected, not thrown
- Validation errors are collected, not thrown
- All errors include file path and details

This allows:

- Partial vault loading
- Reporting all errors at once
- Graceful degradation

## Schema Organization

Schemas are stored in `src/unfold/schemas/`:

- `page.schema.json` - Page/article objects
- `reference.schema.json` - Citation/reference objects
- `concept.schema.json` - Vocabulary term definitions

Each schema:

- Validates structure with standard JSON Schema
- Annotates semantics with `x-jsonld-*` keywords
- Maps to one or more `@type` values

## Next Steps

This module provides the foundation. Current core:

- JSON-LD loading
- Zod schema validation
- SHACL shape validation (see `src/unfold/shacl/`)
