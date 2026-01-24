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
- Build tool decision: use jaq for JSON folding.

Build stack
- Deno for runtime and tasks.
- Lume for static site generation.
- @std/front-matter for parsing note metadata.
- Zod for schema validation of frontmatter.

Obsidian vault
- Vault root is `notes/`.
- Create new notes directly inside `notes/`.
- Supported formats include Markdown and other Obsidian file types.

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

Core project: fold-engine (website implementation)
Explicit problem
- Describe what fold-engine is, why it exists, and how it works inside Basis.

Definitions
- Fold-engine: computation layer that turns large object stores into bounded Markdown folds.
- Fold: schema-bound, cognitively-sized slice (3–5 items) that is navigable.
- Object store: structured JSON items (local files, DB, APIs).
- Schema-bound: each item has a type/shape contract.
- Prompt layer/MCP: commands that advance folds without reactive UI.

Known facts
- Basis uses folds as the primary interface: minimal Markdown views over objects.
- Fold model uses Borel/σ-algebra metaphors for symbolic sets and refinement.
- Markdown renderer is dumb; fold-engine is the brain.
- Folds enforce cognitive limits (~4±1 items).
- Future ingestion includes external APIs (e.g., calendars).

Constraints (inferred)
- Low cognitive load per view.
- Deterministic, auditable fold transitions.
- Schema-first structure; no loose blobs.
- Avoid prompt fatigue; favor agent-driven navigation.
- Stable, composable semantics over clever UX.

Slot-based schema
- Input: object store + schema registry + fold state.
- Query: symbolic filter/set expression.
- Projection: fields chosen for display.
- Bounding: enforce item-count limits + grouping.
- Navigation: car/cdr paging, drill-in, tail, backtrack.
- Caching: memoize fold surfaces + stable IDs.
- Audit: explainability of selection and ordering.
- Output: Markdown surface + machine-readable fold token.

Derived conditions
- A fold is a bounded viewport over a symbolic set, not just a list.
- Continuity matters: the tail remains reachable.
- Rendering is schema-guided, not ad-hoc.
- Deterministic selection: same inputs + state → same surface.
- car/cdr is a navigation semantics, not a data structure.

One-sentence definition
- Fold-engine is a schema-aware view generator that emits small navigable Markdown folds from large structured data.

Core responsibilities
- Select items via symbolic queries (filter/intersect/union).
- Project items into minimal display forms.
- Bound the view to 3–5 items.
- Navigate across folds (next/refine/open/back/tail).
- Cache and stabilize fold identity.
- Explain why a fold exists and why items appear.

What it is not
- Not a reactive UI framework.
- Not a markdown editor.
- Not summarizer-first.
- Not “a list of everything.”

Why it’s neat
- Mirrors cognitive behavior: bounded slice, then move.
- σ-algebra framing enables compositional refinement.
- LLM-native by design: bounded context, stable state, deterministic transitions.

Example mental model
- Object store: tasks/events/journal entries.
- Fold: “Heat-stressed cucumber care.”
- 4 actionable items, each schema-bound.
- Next reveals tail; refine intersects with a schedule; open drills into full detail.

Reduced summary
- Fold-engine = Basis’s attention computation: schema + state → tiny Markdown fold + navigable tails.
