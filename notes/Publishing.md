---
title: publishing
tags:
  - obsidian
  - publish
  - github-pages
schema: fold-v1
fold: bounded-tree
layout: layout.njk
---

# publishing

Obsidian Publish is a hosted option for sharing vault content. We can use it as
an alternative distribution path to GitHub Pages, or as a private staging
surface for drafts.

## Considerations
- Publish uses the vault as the source of truth.
- The `.obsidian/` folder stays local; publish focuses on note content.
- We can keep GitHub Pages as the public site and Publish for curated subsets.
- Track publish limitations to avoid conflicts. See [[publish-limitations]].

## Alignment
- Lume builds from `notes/`, matching the vault source of truth.
- Keep notes portable: no external dependencies required to read.
