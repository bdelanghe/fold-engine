# Unfold Architecture

Note: documentation is generated from Unfold sources via `deno task docs`. Do
not edit this file by hand.

Purpose: Unfold is a compiler that treats each Markdown note as a typed record,
validates the vault, and emits deterministic static artifacts (HTML, JSON,
manifests, and machine-readable projections).

## Overview

The Obsidian vault is the single source of truth. Builds are a compiler-style
pipeline that validates notes, produces a manifest, renders HTML, and emits JSON
artifacts. Publishing is static and deterministic.

## Pipeline (logical)

```
vault/
  ↓
validate frontmatter + JSON-LD
  ↓
render notes → HTML
  ↓
site manifest (JSON)
  ↓
dist/ (publish artifacts)
  ├─ HTML pages
  ├─ site.manifest.json
  ├─ folded.json (future)
  └─ jsonld/ (future)
```

## Phases and outputs

Phase 1 — Static Site Foundation

- Goal: deterministic HTML + manifest.
- Artifacts: `dist/` HTML, minimal manifest JSON.

Phase 2 — JSON Folding Engine

- Goal: structured JSON projections with bounded queries.
- Artifacts: folded JSON files, fold budgets, tests.

Phase 3 — Machine-Readable Outputs

- Goal: JSON-LD and knowledge graph exports.
- Artifacts: JSON-LD bundles, site-level graph.

Phase 4 — Tooling & Experiments

- Goal: tooling experiments and distribution options.
- Artifacts: visualization prototypes, alternate publish targets.

## Schemas

- Frontmatter schema: validates each note before rendering.
- Site manifest schema: stable contract for generated metadata.
- Fold schema: canonical JSON output for projections.

## Build and publish

- Build: `deno task build` (runs `unfold build`)
- Dev: `deno task dev` (runs `unfold dev`)
- Docs: `deno task docs` (generates `dist/unfold/`)
- Publish: deploy `dist/` only.

## Non-goals (for now)

- No CMS or runtime editing.
- No server-side rendering.
- No database or stateful services.
- No multi-vault federation.
