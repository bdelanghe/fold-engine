# Unfold (Compiler Layout)

Unfold is organized as a multi-pass compiler. Each directory is a named pass or
interface, and each pass is independently testable.

## Structure

- `cli/` — entrypoints and argument parsing.
- `pipeline/` — orchestration of passes.
- `inputs/` — vault ingestion, markdown transforms, frontmatter validation.
- `manifests/` — derived structured artifacts (site/fold manifests).
- `renderers/` — output backends (Lume adapter today).
- `exporters/` — non-HTML outputs (JSON, JSON-LD, MCP, graph).
- `schemas/` — canonical JSON schemas.
- `contracts/` — golden expectations and fixtures.
- `tests/` — integration and contract tests.
