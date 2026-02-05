---
title: publish-limitations
tags:
  - obsidian
  - publish
  - limits
schema: fold-v1
fold: bounded-tree
layout: layout.njk
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

## Human slug conventions
There is no single global standard for human-readable slugs, but there are
common conventions driven by web and SEO practice.

- **Lowercase + hyphens**: replace spaces with `-`, avoid underscores
- **Short + descriptive**: favor concise, meaningful words
- **Avoid noise**: skip redundant numbers/dates unless meaningful
- **Stability**: keep published slugs immutable when possible
