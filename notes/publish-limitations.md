---
title: publish-limitations
tags:
  - obsidian
  - publish
  - limits
schema: fold-v1
fold: bounded-tree
jsonld:
  "@context": "https://schema.org"
  "@type": "WebPage"
---

# publish-limitations

This vault should stay compatible with Obsidian Publish. Keep content within
supported formats and avoid patterns that Publish does not accept.

## Compatibility checklist

- Use supported file formats only (Markdown + approved attachments).
- Keep attachment sizes within Publish limits.
- Avoid unsupported plugins or features in published notes.
- Keep vault structure simple and portable (no special filesystem tricks).

Reference: Obsidian Publish limitations.

## URLs and identifiers

When naming publishable URLs or identifiers, prefer stable namespaces over
ad-hoc slugs. A URI-style pattern keeps names globally unique and avoids
semantic drift as titles change.

- **Namespace + local name**: `https://example.org/ontology#Person`
- **Opaque IDs + labels**: store labels separately from the identifier
- **Controlled vocabularies**: track preferred labels + synonyms in metadata

## IPFS and content addressing

IPFS replaces slug-like identifiers with **content identifiers (CIDs)**, which
are cryptographic hashes of the content itself. Links are CIDs, and naming is
treated as metadata layered on top.

- **CID = canonical identifier**: identical content yields identical CIDs
- **IPLD graphs**: links are hash pointers, not human-readable slugs
- **Naming overlays**: IPNS, DNSLink, or DIDs provide mutable labels

## IPLD note decomposition

In IPLD terms, a single note often mixes multiple conceptual layers. Prefer
splitting stable meaning, mutable structure, and indexes into separate nodes
linked by CIDs so that each part can evolve independently.

### Structural atoms

Anything that can be reused, referenced elsewhere, or indexed globally should
be a candidate for its own CID-backed object.

### Front-matter fields as links

Some fields stay inline (like a current title), but structural metadata should
be links.

- **Tags**: treat tags as linked nodes, not strings.
- **Schema**: point to a schema contract node.
- **Fold type**: link to a fold-type definition.
- **Semantic overlays**: JSON-LD belongs in a separate overlay node.

### Markdown body as a content node

The prose content should be a dedicated markdown node so metadata can change
without rewriting the body. This also enables clean diffing and deduplication.

### Optional conceptual anchors

Keep bullet lists in the markdown body unless the concepts recur across many
notes; then elevate them into reusable concept nodes.

### Example skeleton

```json
{
  "type": "note",
  "title": "cognitive-folding",
  "schema": { "/": "bafy...fold-v1" },
  "foldType": { "/": "bafy...bounded-tree" },
  "tags": [
    { "/": "bafy...tag/cognitive" },
    { "/": "bafy...tag/adhd" }
  ],
  "body": { "/": "bafy...markdown" },
  "semanticOverlays": [
    { "/": "bafy...schemaorg-webpage" }
  ],
  "created": "2026-01-24T15:10:00Z",
  "previous": { "/": "bafy...oldversion" }
}
```

## JSON-LD typing for notes

`WebPage` is common because Obsidian Publish emits web pages and schema.org is
optimized for search engines. It is safe and widely indexed, but semantically
underpowered for technical notes.

### Better schema.org defaults

If staying inside schema.org, prefer note-shaped types.

- **DigitalDocument**: simple, accurate for technical docs.
- **TechArticle**: better for documentation and specs.
- **CreativeWork**: flexible but minimal.

Example:

```json
{
  "@context": "https://schema.org",
  "@type": "DigitalDocument",
  "name": "publish-limitations",
  "about": ["obsidian publish", "ipfs", "naming"],
  "genre": "technical-spec"
}
```

### Custom class + schema.org overlay

If you stop optimizing for search engines, declare a first-class class and use
schema.org as a secondary vocabulary.

```json
{
  "@context": {
    "@vocab": "https://example.org/fold#",
    "schema": "https://schema.org/"
  },
  "@type": "Note",
  "title": "publish-limitations",
  "noteKind": "policy",
  "system": "obsidian-publish",
  "schema:about": ["ipfs", "slugging", "naming"]
}
```

### IPLD view

In content-addressed graphs, the JSON-LD overlay is just one lens. The
structural role matters more than SEO types.

- `type: note`
- `noteClass: publish-policy`
- `appliesTo: obsidian-publish`
- `references: [CID...]`

## Human slug conventions

There is no single global standard for human-readable slugs, but there are
common conventions driven by web and SEO practice.

- **Lowercase + hyphens**: replace spaces with `-`, avoid underscores
- **Short + descriptive**: favor concise, meaningful words
- **Avoid noise**: skip redundant numbers/dates unless meaningful
- **Stability**: keep published slugs immutable when possible
