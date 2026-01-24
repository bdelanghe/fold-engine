Fold Engine — GitHub Pages + Obsidian Vault

Purpose
- Treat each Markdown note as a typed record (frontmatter-first).
- Serve the same content both as a GitHub Pages site and as an Obsidian vault.
- Enable JSON/JSON-LD projections for machine reasoning.

What we need to do
1) Content model
- Define frontmatter schema (fields, types, required/optional).
- Decide supported frontmatter formats (YAML only vs YAML/JSON/TOML).
- Define JSON-LD mapping rules and vocabularies.

2) File structure
- Decide vault/site root (`/notes` or `/content`).
- Standardize note naming and slug rules.
- Decide where generated outputs live (`/dist`, `/public`).

3) Build pipeline
- Pick static site generator or custom build (e.g., Deno/Lume).
- Parse frontmatter, validate schema, and fail on invalid notes.
- Render Markdown to HTML.
- Emit JSON and JSON-LD sidecars for each note.

4) Obsidian compatibility
- Keep Markdown + frontmatter readable in Obsidian.
- Avoid build artifacts inside the vault.
- Document required plugins (if any).

5) GitHub Pages delivery
- Disable Jekyll processing (add `.nojekyll`).
- Choose deploy method (Pages from branch vs Actions).
- If using Actions, add workflow to build and publish `/dist`.

6) Minimal MVP
- One example note with frontmatter schema.
- One JSON-LD export.
- One rendered HTML page with embedded JSON-LD.

Open questions
- Which SSG/build tool do we want (Lume, Astro, custom Deno)?
- Where should the vault live in this repo?
- What schema versioning strategy do we want?

Notes: IPFS ecosystem vs ontology systems
- Most IPFS tools are transport/persistence layers; they do not define domain models.
- IPFS itself is schema-agnostic: content-addressed bytes first.
- Schema-adjacent exceptions:
  - IPLD: structural schemas for typed DAG nodes and traversal.
  - Ceramic: typed document schemas for streams/identity.
  - OrbitDB/Mahuta: database/indexing schema, not ontology.
- There are effectively no OWL/RDF/SHACL-style domain ontologies in this space.
- Implication: treat IPFS as substrate; put semantics in higher layers.

Notes: ontology vs schema vs types in Kubo docs
- Ontology: conceptual graph (node, daemon, CLI, gateway, RPC API, binary, OS).
- Schema: implied structures (install recipes, $IPFS_PATH/api, feature lists).
- Types: enforced interfaces (Go structs, CLI args, HTTP API surface).
- Example: "brew install ipfs" is a schema instance of install recipes.
- Tension: humans reason at ontology/schema; machines enforce types.
