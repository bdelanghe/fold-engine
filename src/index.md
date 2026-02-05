---
title: Fold-engine
tags:
  - cognitive-folding
  - json
  - schema
schema: fold-v1
fold: bounded-tree
layout: layout.njk
jsonld: |
  {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "name": "Fold-engine",
    "about": [
      "cognitive folding",
      "JSON",
      "schema",
      "AI"
    ]
  }
---

Fold-engine is a schema-aware view generator that turns large or unknown JSON
into small, navigable Markdown folds.

It treats JSON as a bounded cognitive surface for humans and for AI contexts,
using structured projection and deterministic navigation rather than infinite
trees or dumps.
