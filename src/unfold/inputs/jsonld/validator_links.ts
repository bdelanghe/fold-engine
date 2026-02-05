/**
 * Link integrity validation for JSON-LD nodes.
 */

import { basename, extname } from "@std/path";
import type { VaultNode } from "./types.ts";
import { ValidationError } from "./types.ts";

const REFERENCE_TYPES = new Set(["basis:Reference", "Reference"]);

type LinkReference = {
  id: string;
  file: string;
  sourceId: string;
};

type Definition = {
  id: string;
  file: string;
  sourceId: string;
};

const IS_ROOT = true;
const NOT_ROOT = false;

const asString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const parseUrl = (value: string): URL | null => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const hasReferenceType = (node: VaultNode): boolean => {
  const typeValue = node["@type"];
  if (typeof typeValue === "string") {
    return REFERENCE_TYPES.has(typeValue);
  }
  if (Array.isArray(typeValue)) {
    return typeValue.some((type) => REFERENCE_TYPES.has(type));
  }
  return false;
};

const isReferenceObject = (value: Record<string, unknown>): boolean => {
  const keys = Object.keys(value).filter((key) =>
    key !== "@context" && key !== "_source"
  );
  const nonIdKeys = keys.filter((key) => key !== "@id" && key !== "@type");
  return nonIdKeys.length === 0;
};

const collectNodeLinks = (
  node: VaultNode,
): { links: LinkReference[]; inlineDefinitions: Definition[] } => {
  const links: LinkReference[] = [];
  const inlineDefinitions: Definition[] = [];
  const sourceId = node["@id"];
  const file = node._source?.file ?? "<unknown>";

  const visit = (value: unknown, isRoot: boolean): void => {
    if (Array.isArray(value)) {
      for (const entry of value) {
        visit(entry, NOT_ROOT);
      }
      return;
    }

    if (!value || typeof value !== "object") {
      return;
    }

    const record = value as Record<string, unknown>;
    const id = asString(record["@id"]);

    if (id && !isRoot) {
      if (isReferenceObject(record)) {
        links.push({ id, file, sourceId });
      } else {
        inlineDefinitions.push({ id, file, sourceId });
      }
    }

    for (const [key, entry] of Object.entries(record)) {
      if (key === "@context" || key === "_source") {
        continue;
      }
      visit(entry, NOT_ROOT);
    }
  };

  visit(node, IS_ROOT);

  return { links, inlineDefinitions };
};

const addDefinition = (
  definition: Definition,
  seen: Map<string, Definition>,
): ValidationError | null => {
  const existing = seen.get(definition.id);
  if (existing) {
    return new ValidationError(
      `Duplicate @id found: ${definition.id} (${existing.file} and ${definition.file})`,
      definition.file,
    );
  }
  seen.set(definition.id, definition);
  return null;
};

const buildOrigins = (ids: Iterable<string>): Set<string> => {
  const origins = new Set<string>();
  for (const id of ids) {
    const url = parseUrl(id);
    if (url) {
      origins.add(url.origin);
    }
  }
  return origins;
};

const isInternalId = (id: string, origins: Set<string>): boolean => {
  const url = parseUrl(id);
  if (!url) {
    return false;
  }
  return origins.has(url.origin);
};

const resolveReferenceSlug = (id: string): string | null => {
  const url = parseUrl(id);
  if (!url) {
    return null;
  }
  const trimmed = url.pathname.replace(/\/$/, "");
  const segments = trimmed.split("/").filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : null;
};

const referenceFileMatchesId = (node: VaultNode): boolean => {
  const file = node._source?.file;
  if (!file) {
    return false;
  }
  const parts = file.split(/[\\/]/);
  if (!parts.includes("refs")) {
    return false;
  }
  const slug = resolveReferenceSlug(node["@id"]);
  if (!slug) {
    return false;
  }
  const stem = basename(file, extname(file));
  return stem === slug;
};

export const validateLinkIntegrity = (
  nodes: VaultNode[],
): ValidationError[] => {
  const definitions = new Map<string, Definition>();
  const links: LinkReference[] = [];

  for (const node of nodes) {
    const file = node._source?.file ?? "<unknown>";
    const nodeId = asString(node["@id"]);
    if (!nodeId) {
      continue;
    }

    const duplicate = addDefinition(
      { id: nodeId, file, sourceId: nodeId },
      definitions,
    );
    if (duplicate) {
      return [duplicate];
    }

    if (hasReferenceType(node) && !referenceFileMatchesId(node)) {
      return [
        new ValidationError(
          `Reference node must live under refs/ and match filename: ${nodeId}`,
          file,
        ),
      ];
    }

    const { links: nodeLinks, inlineDefinitions } = collectNodeLinks(node);
    for (const definition of inlineDefinitions) {
      const inlineDuplicate = addDefinition(definition, definitions);
      if (inlineDuplicate) {
        return [inlineDuplicate];
      }
    }
    links.push(...nodeLinks);
  }

  const origins = buildOrigins(definitions.keys());

  for (const link of links) {
    if (!isInternalId(link.id, origins)) {
      continue;
    }

    if (definitions.has(link.id)) {
      continue;
    }

    const [baseId] = link.id.split("#");
    if (baseId && definitions.has(baseId)) {
      continue;
    }

    return [
      new ValidationError(
        `Unresolved internal link: ${link.id}`,
        link.file,
        { source: link.sourceId },
      ),
    ];
  }

  return [];
};
