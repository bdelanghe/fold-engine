# Fold Engine

This repository hosts the **Fold Engine** website.

Content is authored in an Obsidian vault (`obsidian_vault/`) and compiled into
`dist/` for GitHub Pages using the **Unfold** static compiler.

Fold Engine contains the research notes, theory, and documentation. Unfold is
the toolchain that validates and publishes them.

---

## Philosophy

Fold Engine treats knowledge as a set of bounded, composable folds rather than
an unbounded graph. The vault captures local structure and invariants; Unfold
enforces them so published artifacts stay coherent.

The goal is clarity under constraint: make concepts small enough to hold, link
them explicitly, and let tooling validate the edges.

---

## Build

- `deno task build` — full site compile into `dist/`.
- `deno task dev` — watch mode with incremental rebuilds.
- `deno task docs` — regenerate architectural and schema documentation.

---

## Notes

- All content lives in `obsidian_vault/` and is the single source of truth.
- The **Unfold** compiler transforms the vault into the published Fold Engine
  site.
- Unfold’s internals live under `src/unfold/` (see `src/unfold/README.md`).

---

## Repository Layout

- `obsidian_vault/` — authored notes and knowledge graphs.
- `src/unfold/` — schema-first static compiler.
- `dist/` — generated publish artifacts (GitHub Pages target).
- `schemas/` — canonical JSON Schemas used by Unfold.
- `contracts/` — golden fixtures and invariants.
