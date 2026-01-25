# Unfold (Compiler Layout)

Unfold is organized around validation-first JSON-LD. The core pipeline focuses
on type-safe schemas, SHACL-style graph constraints, and deterministic
validation before any rendering or exports.

## Structure

- `cli/` — entrypoints and argument parsing.
- `pipeline/` — validation orchestration.
- `inputs/jsonld/` — vault JSON-LD loading + parsing.
- `schemas/` — canonical JSON Schema docs.
- `schemas/zod/` — Zod schemas (source-of-truth types + validation).
- `shacl/` — SHACL-inspired shapes + graph validation.
- `contracts/` — golden expectations and fixtures.
- `tests/` — integration and contract tests.
- `renderers/` — legacy output backends (de-emphasized).
- `exporters/` — legacy non-HTML outputs (de-emphasized).
