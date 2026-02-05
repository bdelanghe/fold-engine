# Unfold Architecture

Note: documentation is generated from Unfold sources via `deno task docs`. Do
not edit this file by hand.

Purpose: Unfold is a compiler that treats each JSON-LD note as a typed record,
validates the vault with Zod + SHACL constraints, and emits deterministic
validation results before any rendering or exports.

## Overview

The Obsidian vault is the single source of truth. Builds are a compiler-style
pipeline that loads JSON-LD, validates structure with Zod, validates semantics
with SHACL shapes, and gates any publish steps on clean reports.

## Pipeline (logical)

```
vault/
  ↓
load JSON-LD nodes
  ↓
Zod schema validation
  ↓
SHACL shape validation
  ↓
validation report (publish gate)
```

## Phases and outputs

Phase 1 — Validation Core

- Goal: deterministic JSON-LD validation.
- Artifacts: validation reports, typed schemas.

Phase 2 — Graph Contracts

- Goal: SHACL-enforced vault policies.
- Artifacts: shapes, violation reports, contract tests.

Phase 3 — Outputs (Deferred)

- Goal: renderers and exports after validation.
- Artifacts: JSON-LD bundles, site-level graph, HTML.

## Schemas

- JSON-LD Zod schemas: source-of-truth types and structural validation.
- SHACL shapes: graph-level constraints and publish gates.

## Build and publish

- Build: `deno task build` (runs `unfold build`)
- Validate: `deno task validate` (runs `unfold validate`)
- Docs: `deno task docs` (generates `dist/unfold/`)

## Non-goals (for now)

- No rendering or exporters until validation is complete.
- No runtime editing or databases.
