import type { VaultNode } from "../inputs/jsonld/types.ts";
import type { NodeShape, PropertyShape } from "./schema.ts";

const DEFAULT_IGNORED_PROPERTIES = new Set([
  "@id",
  "@type",
  "@context",
  "@graph",
  "_source",
]);

export type ShaclViolation = {
  nodeId: string;
  shapeId: string;
  path: string;
  message: string;
  value?: unknown;
  source?: string;
};

export type ShaclReport = {
  ok: boolean;
  violations: ShaclViolation[];
};

const toArray = (value: unknown): unknown[] => {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
};

const getNodeTypes = (node: VaultNode): string[] => {
  const type = node["@type"];
  if (!type) return [];
  return Array.isArray(type) ? type : [type];
};

const isDate = (value: unknown): boolean => {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
};

const isDateTime = (value: unknown): boolean => {
  if (typeof value !== "string") return false;
  if (!value.includes("T")) return false;
  return !Number.isNaN(Date.parse(value));
};

const isAnyUri = (value: unknown): boolean => {
  if (typeof value !== "string") return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const isInteger = (value: unknown): boolean =>
  typeof value === "number" && Number.isInteger(value);

const isDecimal = (value: unknown): boolean =>
  typeof value === "number" && Number.isFinite(value);

const isDatatypeMatch = (value: unknown, datatype: string): boolean => {
  switch (datatype) {
    case "xsd:string":
      return typeof value === "string";
    case "xsd:boolean":
      return typeof value === "boolean";
    case "xsd:integer":
      return isInteger(value);
    case "xsd:decimal":
      return isDecimal(value);
    case "xsd:date":
      return isDate(value);
    case "xsd:dateTime":
      return isDateTime(value);
    case "xsd:anyURI":
      return isAnyUri(value);
    default:
      return true;
  }
};

const normalizeComparable = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (
    typeof value === "object" &&
    value !== null &&
    "@id" in value &&
    typeof (value as { "@id": unknown })["@id"] === "string"
  ) {
    return (value as { "@id": string })["@id"];
  }
  return null;
};

const hasClass = (value: unknown, expectedClass: string): boolean => {
  if (typeof value !== "object" || value === null) return false;
  const type = (value as { "@type"?: string | string[] })["@type"];
  if (!type) return false;
  const types = Array.isArray(type) ? type : [type];
  return types.includes(expectedClass);
};

const buildViolation = (
  node: VaultNode,
  shape: NodeShape,
  path: string,
  message: string,
  value?: unknown,
): ShaclViolation => ({
  nodeId: node["@id"] ?? "<unknown>",
  shapeId: shape.id,
  path,
  message,
  value,
  source: node._source?.file,
});

const validateProperty = (
  node: VaultNode,
  shape: NodeShape,
  property: PropertyShape,
): ShaclViolation[] => {
  const violations: ShaclViolation[] = [];
  const value = (node as Record<string, unknown>)[property.path];
  const values = toArray(value);

  if (property.minCount !== undefined && values.length < property.minCount) {
    violations.push(
      buildViolation(
        node,
        shape,
        property.path,
        property.message ??
          `Expected at least ${property.minCount} value(s)`,
      ),
    );
  }

  if (property.maxCount !== undefined && values.length > property.maxCount) {
    violations.push(
      buildViolation(
        node,
        shape,
        property.path,
        property.message ??
          `Expected no more than ${property.maxCount} value(s)`,
        value,
      ),
    );
  }

  if (property.datatype) {
    for (const item of values) {
      if (!isDatatypeMatch(item, property.datatype)) {
        violations.push(
          buildViolation(
            node,
            shape,
            property.path,
            property.message ??
              `Expected datatype ${property.datatype}`,
            item,
          ),
        );
      }
    }
  }

  if (property.pattern) {
    const regex = new RegExp(property.pattern);
    for (const item of values) {
      if (typeof item !== "string" || !regex.test(item)) {
        violations.push(
          buildViolation(
            node,
            shape,
            property.path,
            property.message ??
              `Value does not match pattern ${property.pattern}`,
            item,
          ),
        );
      }
    }
  }

  if (property.in) {
    for (const item of values) {
      const comparable = normalizeComparable(item);
      if (!comparable || !property.in.includes(comparable)) {
        violations.push(
          buildViolation(
            node,
            shape,
            property.path,
            property.message ??
              `Value must be one of: ${property.in.join(", ")}`,
            item,
          ),
        );
      }
    }
  }

  if (property.class) {
    for (const item of values) {
      if (!hasClass(item, property.class)) {
        violations.push(
          buildViolation(
            node,
            shape,
            property.path,
            property.message ??
              `Value must be a ${property.class} node`,
            item,
          ),
        );
      }
    }
  }

  return violations;
};

const validateClosedShape = (
  node: VaultNode,
  shape: NodeShape,
): ShaclViolation[] => {
  if (!shape.closed) return [];
  const allowed = new Set(DEFAULT_IGNORED_PROPERTIES);
  for (const prop of shape.ignoredProperties ?? []) {
    allowed.add(prop);
  }
  for (const prop of shape.properties) {
    allowed.add(prop.path);
  }

  const violations: ShaclViolation[] = [];
  for (const key of Object.keys(node)) {
    if (!allowed.has(key)) {
      violations.push(
        buildViolation(
          node,
          shape,
          key,
          `Property not allowed by closed shape`,
        ),
      );
    }
  }

  return violations;
};

export const validateNodesWithShapes = (
  nodes: VaultNode[],
  shapes: NodeShape[],
): ShaclReport => {
  const violations: ShaclViolation[] = [];

  for (const shape of shapes) {
    for (const node of nodes) {
      const types = getNodeTypes(node);
      if (!types.includes(shape.targetClass)) {
        continue;
      }

      for (const property of shape.properties) {
        violations.push(...validateProperty(node, shape, property));
      }
      violations.push(...validateClosedShape(node, shape));
    }
  }

  return {
    ok: violations.length === 0,
    violations,
  };
};

export const formatShaclReport = (report: ShaclReport): string[] => {
  if (report.ok) return [];
  return [
    "SHACL validation failed:",
    ...report.violations.map((violation) => {
      const source = violation.source ? ` (${violation.source})` : "";
      return `  - ${violation.nodeId} ${violation.path}: ${violation.message}${source}`;
    }),
  ];
};
