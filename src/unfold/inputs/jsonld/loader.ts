/**
 * JSON-LD vault loader
 * Loads all .jsonld files from the vault and extracts nodes
 */

import { walk } from "@std/fs/walk";
import type {
  JsonLdDocument,
  JsonLdNode,
  LoadResult,
  VaultNode,
} from "./types.ts";
import { ValidationError } from "./types.ts";
import { vaultConfig } from "../vault/vault_config.ts";

/**
 * Extract nodes from a JSON-LD document
 * Handles @graph, arrays, and single objects
 */
export function extractNodes(doc: JsonLdDocument, file: string): VaultNode[] {
  const nodes: VaultNode[] = [];

  // Case 1: Document has @graph (multiple nodes)
  if (doc["@graph"] && Array.isArray(doc["@graph"])) {
    for (const node of doc["@graph"]) {
      if (node["@id"]) {
        nodes.push({
          ...node,
          _source: { file, path: file },
        });
      }
    }
    return nodes;
  }

  // Case 2: Document is an array
  if (Array.isArray(doc)) {
    for (const item of doc) {
      if (typeof item === "object" && item !== null && "@id" in item) {
        nodes.push({
          ...(item as JsonLdNode),
          _source: { file, path: file },
        });
      }
    }
    return nodes;
  }

  // Case 3: Document is a single node
  if (doc["@id"]) {
    nodes.push({
      ...(doc as JsonLdNode),
      _source: { file, path: file },
    });
  }

  return nodes;
}

/**
 * Load a single JSON-LD file
 */
export async function loadJsonLdFile(filePath: string): Promise<VaultNode[]> {
  try {
    const content = await Deno.readTextFile(filePath);
    const parsed = JSON.parse(content);
    return extractNodes(parsed, filePath);
  } catch (error) {
    throw new ValidationError(
      `Failed to load JSON-LD file: ${
        error instanceof Error ? error.message : String(error)
      }`,
      filePath,
      error,
    );
  }
}

/**
 * Load all JSON-LD files from the vault
 */
export async function loadVault(vaultPath: string): Promise<LoadResult> {
  const nodes: VaultNode[] = [];
  const errors: ValidationError[] = [];

  try {
    for await (
      const entry of walk(vaultPath, {
        exts: [".jsonld"],
        followSymlinks: false,
      })
    ) {
      if (!entry.isFile) continue;

      try {
        const fileNodes = await loadJsonLdFile(entry.path);
        nodes.push(...fileNodes);
      } catch (error) {
        if (error instanceof ValidationError) {
          errors.push(error);
        } else {
          errors.push(
            new ValidationError(
              `Unexpected error loading file: ${
                error instanceof Error ? error.message : String(error)
              }`,
              entry.path,
              error,
            ),
          );
        }
      }
    }
  } catch (error) {
    errors.push(
      new ValidationError(
        `Failed to walk vault directory: ${
          error instanceof Error ? error.message : String(error)
        }`,
        vaultPath,
        error,
      ),
    );
  }

  return { nodes, errors };
}

/**
 * Get vault path from environment or default
 */
export function getVaultPath(): string {
  const override = Deno.env.get("VAULT_PATH");
  if (override && override.trim().length > 0) {
    return override;
  }
  return vaultConfig.vaultPath;
}
