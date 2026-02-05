---
title: cognitive-jq
tags:
  - jq
  - jaq
  - fold
  - json
schema: fold-v1
fold: bounded-tree
jsonld:
  "@context": "https://schema.org"
  "@type": "WebPage"
---

# cognitive-jq

First project: use jaq to generate bounded folds from unknown JSON.

## Goals

- Select structure with jq/jaq filters.
- Project minimal fields for display.
- Emit fold state tokens for navigation.

## Non-goals

- No infinite tree browsing.
- No reactive UI.

## Notes

- Build pipeline uses jaq for the fold computation step.
