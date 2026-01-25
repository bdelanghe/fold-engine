# Fold Engine

This repository hosts the **Fold Engine** website.

Content is authored in an Obsidian vault (`vault/`) and compiled into
`dist/` for GitHub Pages using the **Unfold** static compiler.

Fold Engine contains the research notes, theory, and documentation. Unfold is
the toolchain that validates and publishes them.

---

## Unfold

**Unfold** — articulate the inverse of **fold** in a structured cognitive
engine like your Basis project.

**Definition (explicit):**
An **unfold** is a systematic expansion of a concise, folded schema or set into
a more detailed representation according to a defined generator function or
rule. In your project this means taking a compressed cognitive **fold** (a
navigable view over a Borel-like set) and expanding it into a sequence or
structure that reveals the elements that compose it under a specific generative
rule.

**Reasoning steps:**

1. **Input — Folded structure:**
   You start with a fold ( F ), a schema-bounded markdown view representing an
   abstract set ( S ). This is compressed information with an associated
   generator function ( g ).
   Known fact: ( F ) encodes ( S ) under a compression mapping ( c: S \to F ).

2. **Generator rule (G):**
   Define an **unfold rule** ( u ) that maps a seed (often a minimal
   representation in ( F )) into a potentially infinite sequence or expanded
   set of elements.
   Formal: ( u: seed \to [e_0, e_1, e_2, \dots] ). This is your *anamorphism*
   over the schema.

3. **Operation:**
   Apply ( u ) iteratively to produce detail:
   ( unfold(F, u) = u(seed(F)) ).
   Each element in the output corresponds to an instance guided by ( u ).
   This is the systematic, rule-driven **expansion** of the compressed view.

4. **Closure and termination criteria:**
   An unfold must respect termination constraints or coinductive definitions if
   the structure is infinite. You define a predicate ( p(e) ) to stop: if
   ( p(e_n) ) true, stop expansion.

5. **Output — Expanded structure:**
   The result is a *sequence* or enriched structure that mirrors the original
   Borel-like set in detail while still preserving schema constraints. This can
   be presented as detailed markdown, navigable nodes, or annotated sets.

**Invariant summary:**
Unfold = **Generator rule + Seed extraction + Iterative expansion + Termination
criterion**
This reconstructs the latent structure from the compressed fold without losing
traceability.

**Mini example (schema frame):**

* Fold ( F ): “Even numbers up to N compressed with step 2”
* Seed: 0
* Unfold rule ( u(x) = x + 2 )
* Termination ( p(x) = (x > N) )
* Result: `[0, 2, 4, ..., N]`

**Output summary:**
Unfold in your Basis engine is the **rule-guided expansion** of a compressed
cognitive fold into a detailed structure, operationalized by an anamorphic
generator that preserves schema boundaries and termination semantics.

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

- All content lives in `vault/` and is the single source of truth.
- The **Unfold** compiler transforms the vault into the published Fold Engine
  site.
- Unfold’s internals live under `src/unfold/` (see `src/unfold/README.md`).

---

## Repository Layout

- `vault/` — authored notes and knowledge graphs.
- `src/unfold/` — schema-first static compiler.
- `dist/` — generated publish artifacts (GitHub Pages target).
- `schemas/` — canonical JSON Schemas used by Unfold.
- `contracts/` — golden fixtures and invariants.
