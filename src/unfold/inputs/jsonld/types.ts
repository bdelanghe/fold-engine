/**
 * JSON-LD node types
 */

export type JsonLdContext = string | Record<string, unknown> | Array<string | Record<string, unknown>>;

export interface JsonLdNode {
  "@context"?: JsonLdContext;
  "@id": string;
  "@type"?: string | string[];
  "@graph"?: JsonLdNode[];
  [key: string]: unknown;
}

export interface JsonLdDocument {
  "@context"?: JsonLdContext;
  "@graph"?: JsonLdNode[];
  "@id"?: string;
  "@type"?: string | string[];
  [key: string]: unknown;
}

export interface VaultNode extends JsonLdNode {
  _source?: {
    file: string;
    path: string;
  };
}

export interface LoadResult {
  nodes: VaultNode[];
  errors: ValidationError[];
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly file: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}
