fold-engine-github-pages-obsidian-vault

Purpose

- Treat each Markdown note as a typed record (frontmatter-first).
- Serve the same content both as a GitHub Pages site and as an Obsidian vault.
- Enable JSON/JSON-LD projections for machine reasoning.

Decisions (current)

- Vault root is `notes/` and is the single source of truth.
- Lume builds directly from `notes/` into `_site/`.
- Frontmatter is YAML-only for now.
- Build uses Deno tasks with Lume and a frontmatter validator.
- Notes render without custom layouts for now (keep it simple until build is
  stable).

Build

- `deno task build`
- `deno task dev`

Notes

- Project planning, definitions, and long-form notes live in `notes/`.
- See `notes/project-notes.md` for the detailed context moved from this README.
