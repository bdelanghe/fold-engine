# Unfold

Unfold is a schema-first static compiler that projects Obsidian vaults into validated HTML, JSON, and machine-bounded cognitive surfaces.

Purpose

- Treat each Markdown note as a typed record (frontmatter-first).
- Serve the same content both as a GitHub Pages site and as an Obsidian vault.
- Enable JSON/JSON-LD projections for machine reasoning.

Decisions (current)

- Vault root is `obsidian_vault/` and is the single source of truth.
- Lume builds directly from `obsidian_vault/` into `dist/`.
- Frontmatter is YAML-only for now.
- Build uses Deno tasks with Lume and a frontmatter validator.
- Notes render without custom layouts for now (keep it simple until build is
  stable).

Build

- `deno task build`
- `deno task dev`
- `deno task docs`

Notes

- Project planning, definitions, and long-form notes live in `obsidian_vault/`.
- See `obsidian_vault/project-notes.md` for the detailed context moved from this
  README.

TODO

Phase 1 — Static Site Foundation

- Finalize Lume + Deno build pipeline.
- Confirm Obsidian vault → `dist/` publishing flow is deterministic.
- Enforce frontmatter validation on every note.
- Produce a minimal site manifest artifact.
- Deploy to GitHub Pages and verify clean rebuilds from scratch.
- Document build and publish steps in the README.

Phase 2 — JSON Folding Engine

- Define the canonical “fold” JSON schema.
- Integrate `jaq` for bounded JSON projections.
- Allow notes to reference input JSON and jq/jaq queries in frontmatter.
- Emit folded JSON artifacts alongside HTML pages.
- Track token/size budgets per fold.
- Add tests for folding correctness and schema conformance.

Phase 3 — Machine-Readable Outputs

- Generate JSON-LD projections from validated notes.
- Produce MCP-friendly bounded-context bundles.
- Export a site-level knowledge graph.
- Version fold schemas and manifests.

Phase 4 — Tooling & Experiments

- Prototype interactive fold visualizations in-browser.
- Explore Rust/WASM helpers for JSON processing.
- Add IPFS publish pipeline.
- Measure and record build determinism and artifact hashes.
