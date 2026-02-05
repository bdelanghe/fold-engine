/**
 * JSON Schema validation with JSON-LD semantic awareness
 * Uses x-jsonld-* annotations to validate both structure and semantics
 */

import { Ajv, type ErrorObject } from "ajv";
import addFormatsModule from "ajv-formats";
import type { FormatsPlugin } from "ajv-formats";
import { join } from "@std/path";
import type { VaultNode } from "./types.ts";
import { ValidationError } from "./types.ts";

/**
 * Schema registry mapping @type to schema file
 */
const SCHEMA_MAP: Record<string, string> = {
  "basis:Page": "page.schema.json",
  "Page": "page.schema.json",
  "basis:Reference": "reference.schema.json",
  "Reference": "reference.schema.json",
  "rdfs:Class": "concept.schema.json",
  "skos:Concept": "concept.schema.json",
  "schema:WebPage": "webpage.schema.json",
  "WebPage": "webpage.schema.json",
  "schema:WebSite": "website.schema.json",
  "WebSite": "website.schema.json",
  "schema:WebPageElement": "webpageelement.schema.json",
  "WebPageElement": "webpageelement.schema.json",
  "schema:CreativeWork": "creativework.schema.json",
  "CreativeWork": "creativework.schema.json",
  "schema:DefinedTerm": "definedterm.schema.json",
  "DefinedTerm": "definedterm.schema.json",
  "schema:DefinedTermSet": "definedtermset.schema.json",
  "DefinedTermSet": "definedtermset.schema.json",
  "schema:Person": "person.schema.json",
  "Person": "person.schema.json",
};

/**
 * Load a JSON Schema from the schemas directory
 */
async function loadSchema(
  schemaFile: string,
): Promise<Record<string, unknown>> {
  const schemaPath = join(
    Deno.cwd(),
    "src",
    "unfold",
    "schemas",
    schemaFile,
  );
  const content = await Deno.readTextFile(schemaPath);
  return JSON.parse(content);
}

/**
 * Get schema file for a node's @type
 */
function getSchemaFile(node: VaultNode): string | null {
  const type = node["@type"];
  if (!type) return null;

  // Handle array of types (use first matching)
  const types = Array.isArray(type) ? type : [type];
  for (const t of types) {
    if (SCHEMA_MAP[t]) {
      return SCHEMA_MAP[t];
    }
  }

  return null;
}

/**
 * Create AJV instance with formats
 */
function createValidator(): Ajv {
  const ajv = new Ajv({
    allErrors: true,
    verbose: true,
    strict: false, // Allow x-jsonld-* custom keywords
  });
  const addFormats = addFormatsModule as unknown as FormatsPlugin;
  addFormats(ajv);
  return ajv;
}

/**
 * Validate a single node against its schema
 */
export async function validateNode(node: VaultNode): Promise<void> {
  const schemaFile = getSchemaFile(node);
  if (!schemaFile) {
    // No schema means we can't validate structure
    // But we can check basic JSON-LD requirements
    if (!node["@id"]) {
      throw new ValidationError(
        "Node missing required @id",
        node._source?.file || "unknown",
        node,
      );
    }
    return;
  }

  const schema = await loadSchema(schemaFile);
  const ajv = createValidator();
  const validate = ajv.compile(schema);
  const { _source, ...nodeData } = node;
  const valid = validate(nodeData);

  if (!valid) {
    const errors = validate.errors?.map((e: ErrorObject) => ({
      path: e.instancePath,
      message: e.message,
      params: e.params,
    }));

    const sourceFile = (node as VaultNode)._source?.file ?? "unknown";
    throw new ValidationError(
      `Schema validation failed for ${node["@id"]}`,
      sourceFile,
      errors,
    );
  }
}

/**
 * Validate all nodes
 */
export async function validateNodes(
  nodes: VaultNode[],
): Promise<ValidationError[]> {
  const results = await Promise.allSettled(
    nodes.map(async (node) => {
      await validateNode(node);
      return node;
    }),
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

/**
 * Extract semantic annotations from schema
 * This can be used to generate @context from x-jsonld-* annotations
 */
export function extractSemanticAnnotations(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const context: Record<string, unknown> = {};
  const properties = schema.properties as Record<string, unknown> | undefined;

  if (!properties) return context;

  for (const [propName, propSchema] of Object.entries(properties)) {
    const prop = propSchema as Record<string, unknown>;

    // x-jsonld-term: maps to IRI
    if (prop["x-jsonld-term"]) {
      context[propName] = prop["x-jsonld-term"];
    }

    // x-jsonld-id: marks this as @id field
    if (prop["x-jsonld-id"]) {
      // Already handled by JSON-LD @id
      continue;
    }

    // x-jsonld-type: marks this as @type field
    if (prop["x-jsonld-type"]) {
      // Already handled by JSON-LD @type
      continue;
    }

    // x-jsonld-datatype: specify datatype
    if (prop["x-jsonld-datatype"]) {
      context[propName] = {
        "@id": prop["x-jsonld-term"] || propName,
        "@type": prop["x-jsonld-datatype"],
      };
    }

    // x-jsonld-container: specify container type
    if (prop["x-jsonld-container"]) {
      const existing = context[propName];
      if (typeof existing === "string") {
        context[propName] = {
          "@id": existing,
          "@container": prop["x-jsonld-container"],
        };
      } else if (typeof existing === "object" && existing !== null) {
        (existing as Record<string, unknown>)["@container"] =
          prop["x-jsonld-container"];
      } else {
        context[propName] = {
          "@id": prop["x-jsonld-term"] || propName,
          "@container": prop["x-jsonld-container"],
        };
      }
    }
  }

  return context;
}
