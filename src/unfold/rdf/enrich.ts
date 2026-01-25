/**
 * Enrich JSON-LD nodes with RDF metadata
 *
 * Adds computed properties like basis:cid for content addressing
 */

import type { VaultNode } from "../inputs/jsonld/types.ts";
import { canonicalizeJsonLd, computeCid } from "./canonicalize.ts";

/**
 * Enriched node with RDF metadata
 */
export interface EnrichedNode extends VaultNode {
  "basis:cid"?: string;
  "basis:canonicalHash"?: string;
}

/**
 * Enrich a node with basis:cid and other RDF metadata
 *
 * @param node - Node to enrich
 * @returns Enriched node with basis:cid property
 */
export async function enrichNode(node: VaultNode): Promise<EnrichedNode> {
  // Create a copy without internal _source metadata
  const { _source, ...cleanNode } = node;

  // Canonicalize the clean node
  const canonical = await canonicalizeJsonLd(cleanNode);

  // Compute CID
  const cid = computeCid(canonical);

  // Return enriched node (preserving original, adding metadata)
  return {
    ...node,
    "basis:cid": cid,
    "basis:canonicalHash": canonical.hash,
  };
}

/**
 * Enrich multiple nodes
 */
export function enrichNodes(nodes: VaultNode[]): Promise<EnrichedNode[]> {
  return Promise.all(nodes.map(enrichNode));
}
