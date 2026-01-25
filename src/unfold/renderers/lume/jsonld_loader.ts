/**
 * Lume loader for JSON-LD files
 * Converts JSON-LD nodes into Lume pages
 */

import type { JsonLdNode } from "../../inputs/jsonld/types.ts";

/**
 * Lume page data (simplified)
 */
type PageData = Record<string, unknown>;

/**
 * Lume loader function type
 */
type LoaderFunction = (path: string) => Promise<PageData>;

/**
 * Extract page data from a JSON-LD node
 * Maps JSON-LD properties to Lume page data
 */
function extractPageData(node: JsonLdNode): PageData {
  const extractedDate = extractDate(node);

  const data: PageData = {
    // Required Lume fields
    url: extractUrl(node),
    title: extractTitle(node),
    date: extractedDate || new Date(), // Lume requires Date, not undefined

    // Optional fields
    description: extractString(node, "description"),

    // Content
    content: extractContent(node),

    // JSON-LD metadata (full node for <script type="application/ld+json">)
    // The layout template will inject this into the page head
    jsonld: node,

    // Metas for SEO
    metas: {
      title: extractTitle(node),
      description: extractString(node, "description"),
      type: "article",
    },
  };

  // Add @type if present
  if (node["@type"]) {
    data.type = Array.isArray(node["@type"]) ? node["@type"][0] : node["@type"];
  }

  return data;
}

/**
 * Extract URL from @id
 * Convert @id IRI to Lume-friendly URL path
 */
function extractUrl(node: JsonLdNode): string {
  const id = node["@id"];
  if (!id) {
    throw new Error(`Node missing @id: ${JSON.stringify(node)}`);
  }

  try {
    const url = new URL(id);
    // Return pathname (e.g., /pages/hello from https://example.org/pages/hello)
    return url.pathname + url.hash;
  } catch {
    // If not a valid URL, use as-is
    return id;
  }
}

/**
 * Extract title from various JSON-LD properties
 */
function extractTitle(node: JsonLdNode): string {
  // Try common title properties
  const candidates = [
    node.title,
    node.name,
    node.label,
    node["schema:name"],
    node["rdfs:label"],
    node["skos:prefLabel"],
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  // Fallback to @id
  return extractUrl(node);
}

/**
 * Extract string value from property
 */
function extractString(node: JsonLdNode, ...props: string[]): string | undefined {
  for (const prop of props) {
    const value = node[prop];
    if (typeof value === "string") {
      return value;
    }
  }
  return undefined;
}

/**
 * Extract date from dateCreated, dateModified, or datePublished
 */
function extractDate(node: JsonLdNode): Date | undefined {
  const dateStr = extractString(
    node,
    "dateCreated",
    "dateModified",
    "datePublished",
    "schema:dateCreated",
    "schema:dateModified",
    "schema:datePublished",
  );

  if (dateStr) {
    try {
      return new Date(dateStr);
    } catch {
      return undefined;
    }
  }

  return undefined;
}

/**
 * Extract content from the node
 */
function extractContent(node: JsonLdNode): string {
  // Check for explicit content properties
  const content = extractString(
    node,
    "content",
    "text",
    "articleBody",
    "schema:text",
    "schema:articleBody",
  );

  if (content) {
    return content;
  }

  // Check for hasPart sections
  if (Array.isArray(node.hasPart)) {
    const sections = node.hasPart
      .map((part) => {
        if (typeof part === "object" && part !== null) {
          const sectionTitle = extractTitle(part as JsonLdNode);
          const sectionContent = extractContent(part as JsonLdNode);
          return `<section>\n<h2>${sectionTitle}</h2>\n${sectionContent}\n</section>`;
        }
        return "";
      })
      .filter(Boolean);

    if (sections.length > 0) {
      return sections.join("\n\n");
    }
  }

  // Fallback: render as description
  const description = extractString(node, "description");
  if (description) {
    return `<p>${description}</p>`;
  }

  return "";
}

/**
 * Lume loader for .jsonld files
 */
export default function (): LoaderFunction {
  return async (path: string) => {
    const content = await Deno.readTextFile(path);
    const parsed = JSON.parse(content);

    // Handle different JSON-LD structures
    let nodes: JsonLdNode[] = [];

    if (Array.isArray(parsed)) {
      // Array of nodes
      nodes = parsed.filter((item) => item["@id"]);
    } else if (parsed["@graph"]) {
      // Document with @graph
      nodes = parsed["@graph"].filter((item: JsonLdNode) => item["@id"]);
    } else if (parsed["@id"]) {
      // Single node
      nodes = [parsed];
    }

    // Convert nodes to Lume page data
    // For now, take the first node as the page
    // TODO: Handle multi-node documents (sections, embeds)
    const mainNode = nodes[0];
    if (!mainNode) {
      throw new Error(`No nodes with @id found in ${path}`);
    }

    const data = extractPageData(mainNode);

    // Store all nodes for potential use
    data.allNodes = nodes;

    return data;
  };
}
