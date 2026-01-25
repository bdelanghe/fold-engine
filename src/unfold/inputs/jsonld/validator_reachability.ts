/**
 * Reachability validation for JSON-LD nodes.
 */

import type { VaultNode } from "./types.ts";
import { ValidationError } from "./types.ts";
import { enrichNodes } from "../../rdf/enrich.ts";

const IS_ROOT = true;
const NOT_ROOT = false;

const DATASET_TYPES = new Set(["Dataset"]);
const ROOT_TYPES = new Set(["Catalog", "basis:VaultIndex"]);
const DRAFT_STATUSES = new Set(["draft", "private"]);

type NodeReference = {
  id: string;
  sourceId: string;
  file: string;
};

const asString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const normalizeTypeList = (value: unknown): string[] => {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  return [];
};

const parseUrl = (value: string): URL | null => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const collectReferences = (node: VaultNode): NodeReference[] => {
  const references: NodeReference[] = [];
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
      references.push({ id, sourceId, file });
    }

    for (const [key, entry] of Object.entries(record)) {
      if (key === "@context" || key === "_source") {
        continue;
      }
      visit(entry, NOT_ROOT);
    }
  };

  visit(node, IS_ROOT);
  return references;
};

const splitFragment = (id: string): string => id.split("#")[0];

const getDatasetPrefixes = (node: VaultNode): string[] => {
  const datasets = node.dataset;
  if (!Array.isArray(datasets)) {
    return [];
  }

  return datasets
    .map((entry) => {
      if (entry && typeof entry === "object") {
        return asString((entry as Record<string, unknown>)["@id"]);
      }
      return null;
    })
    .filter((id): id is string => Boolean(id));
};

const getEntrypoints = (node: VaultNode): string[] => {
  const entrypoints = node.entrypoint;
  if (!Array.isArray(entrypoints)) {
    return [];
  }

  return entrypoints
    .map((entry) => {
      if (entry && typeof entry === "object") {
        return asString((entry as Record<string, unknown>)["@id"]);
      }
      return asString(entry);
    })
    .filter((id): id is string => Boolean(id));
};

const isDraftOrPrivate = (node: VaultNode): boolean => {
  const status = asString((node as Record<string, unknown>).status);
  return status ? DRAFT_STATUSES.has(status) : false;
};

export async function validateReachability(
  nodes: VaultNode[],
): Promise<ValidationError[]> {
  const enriched = await enrichNodes(nodes);
  const cidIndex = new Map<string, VaultNode>();
  const idIndex = new Map<string, VaultNode>();

  for (const node of enriched) {
    const cid = asString((node as Record<string, unknown>)["basis:cid"]);
    const id = asString(node["@id"]);
    if (!id || !cid) {
      continue;
    }
    if (cidIndex.has(cid)) {
      return [
        new ValidationError(
          `Duplicate basis:cid detected: ${cid}`,
          node._source?.file || "unknown",
        ),
      ];
    }
    cidIndex.set(cid, node);
    idIndex.set(id, node);
  }

  const roots = new Set<string>();
  const datasetPrefixes = new Set<string>();

  for (const node of enriched) {
    const types = normalizeTypeList(node["@type"]);
    for (const type of types) {
      if (ROOT_TYPES.has(type)) {
        const id = asString(node["@id"]);
        if (id) {
          roots.add(id);
        }
        for (const prefix of getDatasetPrefixes(node)) {
          datasetPrefixes.add(prefix);
        }
        for (const entrypoint of getEntrypoints(node)) {
          roots.add(entrypoint);
        }
      }
      if (DATASET_TYPES.has(type)) {
        const id = asString(node["@id"]);
        if (id) {
          datasetPrefixes.add(id);
        }
      }
    }
  }

  for (const prefix of datasetPrefixes) {
    roots.add(prefix);
  }

  if (roots.size === 0) {
    return [
      new ValidationError(
        "Reachability validation failed: no root nodes found",
        "<unknown>",
      ),
    ];
  }

  const origins = new Set<string>();
  for (const id of idIndex.keys()) {
    const url = parseUrl(id);
    if (url) {
      origins.add(url.origin);
    }
  }

  const reachable = new Set<string>();
  const queue: VaultNode[] = [];

  for (const rootId of roots) {
    const rootNode = idIndex.get(rootId);
    if (rootNode) {
      const cid = asString((rootNode as Record<string, unknown>)["basis:cid"]);
      if (cid && !reachable.has(cid)) {
        reachable.add(cid);
        queue.push(rootNode);
      }
      continue;
    }

    for (const node of enriched) {
      const nodeId = asString(node["@id"]);
      const cid = asString((node as Record<string, unknown>)["basis:cid"]);
      if (!nodeId || !cid) {
        continue;
      }
      if (nodeId.startsWith(rootId)) {
        if (!reachable.has(cid)) {
          reachable.add(cid);
          queue.push(node);
        }
      }
    }
  }

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const refs = collectReferences(current);
    for (const ref of refs) {
      const url = parseUrl(ref.id);
      if (!url || !origins.has(url.origin)) {
        continue;
      }

      const targetId = ref.id;
      const baseId = splitFragment(ref.id);
      const targetNode = idIndex.get(targetId) ?? idIndex.get(baseId);
      if (!targetNode) {
        continue;
      }

      const cid = asString(
        (targetNode as Record<string, unknown>)["basis:cid"],
      );
      if (!cid || reachable.has(cid)) {
        continue;
      }

      reachable.add(cid);
      queue.push(targetNode);
    }
  }

  const unreachable = enriched.filter((node) => {
    const cid = asString((node as Record<string, unknown>)["basis:cid"]);
    if (!cid) {
      return false;
    }
    if (reachable.has(cid)) {
      return false;
    }
    return !isDraftOrPrivate(node);
  });

  if (unreachable.length > 0) {
    const node = unreachable[0];
    const nodeId = asString(node["@id"]) ?? "<unknown>";
    return [
      new ValidationError(
        `Unreachable node detected: ${nodeId}`,
        node._source?.file || "unknown",
      ),
    ];
  }

  return [];
}
