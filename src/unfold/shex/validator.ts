import type { VaultNode } from "../inputs/jsonld/types.ts";

type ShexNodeConstraint = {
  type: "NodeConstraint";
  datatype?: string;
  nodeKind?: "iri";
  values?: string[];
};

type ShexShapeRef = {
  type: "ShapeRef";
  reference: string;
};

type ShexTripleConstraint = {
  type: "TripleConstraint";
  predicate: string;
  valueExpr?: ShexNodeConstraint | ShexShapeRef;
  min?: number;
  max?: number;
};

type ShexEachOf = {
  type: "EachOf";
  expressions: ShexTripleConstraint[];
};

type ShexShape = {
  id: string;
  type: "Shape";
  closed?: boolean;
  expression: ShexEachOf;
};

type ShexSchema = {
  type: "Schema";
  prefixes?: Record<string, string>;
  start?: string;
  shapes: ShexShape[];
};

type ShapeProperty = {
  path: string;
  minCount?: number;
  maxCount?: number;
};

type Shape = {
  id: string;
  targetClass: string;
  allowedTypes?: string[];
  required?: string[];
  properties?: ShapeProperty[];
};

type ShapesDocument = {
  shapes: Shape[];
};

export type ShexViolation = {
  nodeId: string;
  shapeId: string;
  message: string;
  path?: string;
  source?: string;
};

export type ShexReport = {
  ok: boolean;
  violations: ShexViolation[];
};

const toArray = (value: unknown): unknown[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

const iriToKey = (predicate: string): string => {
  if (predicate === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
    return "@type";
  }
  if (predicate.startsWith("https://schema.org/")) {
    return predicate.slice("https://schema.org/".length);
  }
  if (predicate.startsWith("http://schema.org/")) {
    return predicate.slice("http://schema.org/".length);
  }
  return predicate;
};

const normalizeType = (value: string): string => {
  if (value.startsWith("https://schema.org/")) {
    return value;
  }
  if (value.startsWith("schema:")) {
    return `https://schema.org/${value.slice("schema:".length)}`;
  }
  return `https://schema.org/${value}`;
};

const isIriValue = (value: unknown): boolean => {
  if (typeof value === "string") {
    return value.startsWith("http://") || value.startsWith("https://");
  }
  if (value && typeof value === "object") {
    const id = (value as Record<string, unknown>)["@id"];
    return typeof id === "string" &&
      (id.startsWith("http://") || id.startsWith("https://"));
  }
  return false;
};

const nodeValueList = (node: VaultNode, key: string): unknown[] => {
  if (key === "@type") {
    return toArray(node["@type"]);
  }
  return toArray((node as Record<string, unknown>)[key]);
};

const matchesNodeConstraint = (
  value: unknown,
  constraint: ShexNodeConstraint,
): boolean => {
  if (constraint.nodeKind === "iri") {
    return isIriValue(value);
  }
  if (constraint.datatype) {
    return typeof value === "string";
  }
  if (constraint.values) {
    if (typeof value !== "string") {
      return false;
    }
    const normalized = normalizeType(value);
    return constraint.values.some((expected) =>
      normalizeType(expected) === normalized
    );
  }
  return true;
};

const resolveNodeById = (
  nodesById: Map<string, VaultNode>,
  value: unknown,
): VaultNode | null => {
  if (typeof value === "string") {
    return nodesById.get(value) ?? null;
  }
  if (value && typeof value === "object") {
    const id = (value as Record<string, unknown>)["@id"];
    if (typeof id === "string") {
      return nodesById.get(id) ?? null;
    }
  }
  return null;
};

const getNodeTypes = (node: VaultNode): string[] => {
  const value = node["@type"];
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const countValues = (node: VaultNode, path: string): number => {
  const value = (node as Record<string, unknown>)[path];
  return toArray(value).length;
};

const validateShape = (node: VaultNode, shape: Shape): ShexViolation[] => {
  const violations: ShexViolation[] = [];
  const nodeId = node["@id"] ?? "<unknown>";
  const source = node._source?.file;

  if (shape.allowedTypes?.length) {
    const nodeTypes = getNodeTypes(node);
    const matches = nodeTypes.some((type) => shape.allowedTypes?.includes(type));
    if (!matches) {
      violations.push({
        nodeId,
        shapeId: shape.id,
        message: `Expected @type to be one of ${shape.allowedTypes.join(", ")}`,
        path: "@type",
        source,
      });
    }
  }

  if (shape.required) {
    for (const key of shape.required) {
      const count = countValues(node, key);
      if (count === 0) {
        violations.push({
          nodeId,
          shapeId: shape.id,
          message: `Missing required property ${key}`,
          path: key,
          source,
        });
      }
    }
  }

  if (shape.properties) {
    for (const property of shape.properties) {
      const count = countValues(node, property.path);
      if (property.minCount !== undefined && count < property.minCount) {
        violations.push({
          nodeId,
          shapeId: shape.id,
          message: `Expected at least ${property.minCount} value(s)`,
          path: property.path,
          source,
        });
      }
      if (property.maxCount !== undefined && count > property.maxCount) {
        violations.push({
          nodeId,
          shapeId: shape.id,
          message: `Expected no more than ${property.maxCount} value(s)`,
          path: property.path,
          source,
        });
      }
    }
  }

  return violations;
};

const validateShexShape = (
  node: VaultNode,
  shape: ShexShape,
  nodesById: Map<string, VaultNode>,
  shapesById: Map<string, ShexShape>,
): ShexViolation[] => {
  const violations: ShexViolation[] = [];
  const nodeId = node["@id"] ?? "<unknown>";
  const source = node._source?.file;
  const expressions = shape.expression.expressions;
  const allowedKeys = new Set<string>(["@context", "@id", "@type"]);

  for (const expr of expressions) {
    const key = iriToKey(expr.predicate);
    allowedKeys.add(key);
    const values = nodeValueList(node, key);
    const min = expr.min ?? 0;
    const max = expr.max ?? Infinity;
    if (values.length < min) {
      violations.push({
        nodeId,
        shapeId: shape.id,
        message: `Expected at least ${min} value(s)`,
        path: key,
        source,
      });
      continue;
    }
    if (values.length > max) {
      violations.push({
        nodeId,
        shapeId: shape.id,
        message: `Expected no more than ${max} value(s)`,
        path: key,
        source,
      });
      continue;
    }
    if (!expr.valueExpr) {
      continue;
    }
    for (const value of values) {
      if (expr.valueExpr.type === "NodeConstraint") {
        if (!matchesNodeConstraint(value, expr.valueExpr)) {
          violations.push({
            nodeId,
            shapeId: shape.id,
            message: `Value does not match constraint for ${key}`,
            path: key,
            source,
          });
        }
      }
      if (expr.valueExpr.type === "ShapeRef") {
        const target = resolveNodeById(nodesById, value);
        if (!target) {
          violations.push({
            nodeId,
            shapeId: shape.id,
            message: `Missing referenced node for ${key}`,
            path: key,
            source,
          });
          continue;
        }
        const nestedShape = shapesById.get(expr.valueExpr.reference);
        if (nestedShape) {
          violations.push(
            ...validateShexShape(target, nestedShape, nodesById, shapesById),
          );
        }
      }
    }
  }

  if (shape.closed) {
    for (const key of Object.keys(node)) {
      if (key === "_source") {
        continue;
      }
      if (!allowedKeys.has(key)) {
        violations.push({
          nodeId,
          shapeId: shape.id,
          message: `Unexpected property ${key}`,
          path: key,
          source,
        });
      }
    }
  }

  return violations;
};

const getStartTypes = (shape: ShexShape): string[] => {
  const typeConstraint = shape.expression.expressions.find((expr) =>
    expr.predicate === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
  );
  const values = typeConstraint?.valueExpr?.type === "NodeConstraint"
    ? typeConstraint.valueExpr.values ?? []
    : [];
  return values.map((value) => normalizeType(value));
};

export const validateNodesWithShex = (
  nodes: VaultNode[],
  schema: ShexSchema,
): ShexReport => {
  const shapesById = new Map(schema.shapes.map((shape) => [shape.id, shape]));
  const nodesById = new Map(nodes.map((node) => [node["@id"], node]));
  const violations: ShexViolation[] = [];

  const startShape = schema.start ? shapesById.get(schema.start) : undefined;
  const shapesToRun = startShape ? [startShape] : schema.shapes;
  const startTypes = startShape ? getStartTypes(startShape) : [];

  for (const shape of shapesToRun) {
    if (!shape) continue;
    const matching = nodes.filter((node) =>
      startTypes.length === 0 ||
      getNodeTypes(node).some((type) =>
        startTypes.includes(normalizeType(type))
      )
    );
    for (const node of matching) {
      violations.push(
        ...validateShexShape(node, shape, nodesById, shapesById),
      );
    }
  }

  return { ok: violations.length === 0, violations };
};

export const validateNodesWithShapes = (
  nodes: VaultNode[],
  shapes: ShapesDocument,
): ShexReport => {
  const violations: ShexViolation[] = [];

  for (const shape of shapes.shapes) {
    const matching = nodes.filter((node) =>
      getNodeTypes(node).includes(shape.targetClass)
    );
    for (const node of matching) {
      violations.push(...validateShape(node, shape));
    }
  }

  return { ok: violations.length === 0, violations };
};
