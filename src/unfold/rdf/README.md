# RDF Module

RDF Dataset Canonicalization and content addressing for JSON-LD.

## Purpose

This module implements W3C RDF Dataset Canonicalization (RDFC-1.0, formerly URDNA2015) to enable:

- **Deterministic CIDs** - Same content always produces same hash
- **Content addressing** - IPFS integration via `basis:cid`
- **Deduplication** - Identical nodes identified by hash
- **Merkle-DAG storage** - Content-addressed graph structure
- **Reproducible builds** - Build artifacts are verifiable

## Architecture

```
JSON-LD Node
  ↓ (remove _source metadata)
Canonical Form
  ↓ (deterministic serialization)
SHA-256 Hash
  ↓
basis:cid (ipfs://sha256-<hash>)
```

## Usage

### Canonicalize a Node

```typescript
import { canonicalizeJsonLd } from "./canonicalize.ts";

const node = {
  "@id": "https://example.org/page",
  "@type": "Page",
  "title": "Example",
};

const canonical = await canonicalizeJsonLd(node);
// canonical.hash = "abc123..."
// canonical.canonical = deterministic string representation
```

### Enrich with basis:cid

```typescript
import { enrichNode } from "./enrich.ts";

const enriched = await enrichNode(node);
// enriched["basis:cid"] = "ipfs://sha256-abc123..."
// enriched["basis:canonicalHash"] = "abc123..."
```

## Properties Added

Enriched nodes gain two properties:

- **`basis:cid`** - IPFS-style content identifier
- **`basis:canonicalHash`** - SHA-256 hash of canonical form

These are:
- Deterministic (same content = same CID)
- Excluded from their own canonicalization (no circular dependency)
- Used for content addressing and IPFS integration

## Implementation Status

**Current (placeholder):**
- Deterministic JSON serialization (sorted keys)
- SHA-256 hashing
- IPFS-style CID format (`ipfs://sha256-<hash>`)

**Future (full RDFC-1.0):**
- RDF expansion from JSON-LD
- N-Quads canonicalization
- URDNA2015/RDFC-1.0 algorithm
- Real IPFS CIDs (multibase, multihash, CIDv1)

**Libraries to integrate:**
- `rdfjs-c14n` - Modern RDFC-1.0 for Deno
- `rdf-canonize` - Reference implementation
- IPFS libraries for proper CID generation

## Tests

All tests passing:
- `canonicalize_test.ts` - 7 tests
- `enrich_test.ts` - 5 tests

Key properties tested:
- Determinism (same input = same output)
- Key order independence
- _source exclusion
- Collision resistance (different inputs = different hashes)
