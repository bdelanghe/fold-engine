/**
 * RDF Dataset Canonicalization (RDFC-1.0, formerly URDNA2015)
 *
 * Implements W3C RDF Dataset Canonicalization for:
 * - Stable hashing (deterministic CIDs)
 * - Content addressing (IPFS integration)
 * - Deduplication
 * - Merkle-DAG storage
 *
 * Uses the rdfjs-c14n library which implements RDFC-1.0
 * (URDNA2015 is deprecated and supported as alias for RDFC-1.0)
 *
 * @see https://www.w3.org/TR/rdf-canon/
 * @see https://github.com/iherman/rdfjs-c14n
 */

import type { JsonLdNode } from "../inputs/jsonld/types.ts";

/**
 * Canonicalized RDF dataset result
 */
export interface CanonicalizedDataset {
  /** Canonical N-Quads representation */
  canonical: string;
  /** SHA-256 hash of canonical form */
  hash: string;
  /** IPFS CID (basis:cid) - will be implemented with IPFS integration */
  cid?: string;
}

/**
 * Canonicalize a JSON-LD document to N-Quads
 *
 * This is a placeholder implementation that will use rdfjs-c14n
 * once we integrate the library. For now, it provides the interface
 * and a simple deterministic serialization.
 *
 * @param node - JSON-LD node to canonicalize
 * @returns Canonicalized dataset with hash
 */
export async function canonicalizeJsonLd(
  node: JsonLdNode,
): Promise<CanonicalizedDataset> {
  // TODO(@bdelanghe): Integrate rdfjs-c14n library
  // For now, use deterministic JSON serialization as placeholder

  const canonical = await deterministicSerialize(node);
  const hash = await sha256(canonical);

  return {
    canonical,
    hash,
  };
}

/**
 * Deterministic JSON serialization
 * Sorts keys, removes whitespace, ensures consistent output
 */
function deterministicSerialize(obj: unknown): string {
  if (obj === null || obj === undefined) {
    return String(obj);
  }

  if (typeof obj !== "object") {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    const items = obj.map(deterministicSerialize);
    return `[${items.join(",")}]`;
  }

  // Sort object keys for deterministic output
  const sorted = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = sorted.map((key) => {
    const value = (obj as Record<string, unknown>)[key];
    return `${JSON.stringify(key)}:${deterministicSerialize(value)}`;
  });

  return `{${pairs.join(",")}}`;
}

/**
 * Compute SHA-256 hash
 */
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Canonicalize multiple nodes
 */
export function canonicalizeNodes(
  nodes: JsonLdNode[],
): Promise<CanonicalizedDataset[]> {
  return Promise.all(nodes.map(canonicalizeJsonLd));
}

/**
 * Compute content-addressable identifier (basis:cid)
 *
 * This will be enhanced with IPFS CID generation
 * For now, returns the hash as ipfs://sha256-<hash>
 */
export function computeCid(canonical: CanonicalizedDataset): string {
  return `ipfs://sha256-${canonical.hash}`;
}
