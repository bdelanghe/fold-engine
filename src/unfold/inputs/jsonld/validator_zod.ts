/**
 * Zod-based JSON-LD validator
 *
 * Replaces Ajv/JSON Schema with Zod for:
 * - Type-safe validation
 * - Better error messages
 * - TypeScript inference
 * - Can still generate JSON Schema for external tools
 */

import type { VaultNode } from "./types.ts";
import { ValidationError } from "./types.ts";
import { getSchemaForType } from "../../schemas/zod/mod.ts";
import { z } from "zod";

/**
 * Validate a single node using Zod schema
 */
export function validateNode(node: VaultNode): Promise<void> {
  return Promise.resolve().then(() => {
    // Basic JSON-LD requirements
    if (!node["@id"]) {
      throw new ValidationError(
        "Node missing required @id",
        node._source?.file || "unknown",
        node,
      );
    }

    // Get schema for node type
    const schema = getSchemaForType(node["@type"]);
    if (!schema) {
      // No schema for this type - that's okay, just check @id exists
      return;
    }

    // Validate with Zod
    try {
      schema.parse(node);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
          code: e.code,
        }));

        throw new ValidationError(
          `Zod validation failed for ${node["@id"]}: ${
            error.errors[0].message
          }`,
          node._source?.file || "unknown",
          errors,
        );
      }

      throw new ValidationError(
        `Validation error: ${
          error instanceof Error ? error.message : String(error)
        }`,
        node._source?.file || "unknown",
        error,
      );
    }
  });
}

/**
 * Validate all nodes
 */
export async function validateNodes(
  nodes: VaultNode[],
): Promise<ValidationError[]> {
  const results = await Promise.allSettled(
    nodes.map((node) => validateNode(node)),
  );

  return results.flatMap((result, index) => {
    if (result.status === "fulfilled") {
      return [];
    }

    const error = result.reason;
    const node = nodes[index];
    if (error instanceof ValidationError) {
      return [error];
    }

    return [
      new ValidationError(
        `Validation error: ${
          error instanceof Error ? error.message : String(error)
        }`,
        node?._source?.file || "unknown",
        error,
      ),
    ];
  });
}
