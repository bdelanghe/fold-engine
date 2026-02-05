# SHACL Validation

This module provides a SHACL-inspired validator focused on JSON-LD vault nodes.
Shapes are expressed as JSON and parsed with Zod for strict, type-safe checks.

## Shapes

Default shapes live in `src/unfold/shacl/shapes.json`. Override the location by
setting `SHACL_SHAPES_PATH`.

## Usage

```ts
import { loadShapes } from "./loader.ts";
import { validateNodesWithShapes } from "./validator.ts";

const shapes = await loadShapes();
const report = validateNodesWithShapes(nodes, shapes.shapes);

if (!report.ok) {
  console.error(report.violations);
}
```

## Supported constraints

- `minCount` / `maxCount`
- `datatype` (`xsd:string`, `xsd:anyURI`, `xsd:date`, `xsd:dateTime`,
  `xsd:boolean`, `xsd:integer`, `xsd:decimal`)
- `pattern`
- `in`
- `class`
- `closed` (with `ignoredProperties`)

## Adding a new node type

1. Add/extend the Zod schema in `src/unfold/schemas/zod/`.
2. Add a matching shape entry in `src/unfold/shacl/shapes.json`.
3. Add validation tests in `src/unfold/shacl/validator_test.ts` to cover new
   constraints.
