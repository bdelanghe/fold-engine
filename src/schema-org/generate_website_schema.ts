import { parse } from "@std/csv";
import { join } from "@std/path";

type CsvRow = {
  id?: string;
  label?: string;
  comment?: string;
  domainIncludes?: string;
  rangeIncludes?: string;
};

type Options = {
  release: string;
  releasesDir: string;
  out: string;
  includeDomains: string[];
};

const DEFAULT_RELEASE = "29.4";
const DEFAULT_RELEASES_DIR = join(
  Deno.cwd(),
  "schemas",
  "schema-org",
  "releases",
);
const DEFAULT_OUT = join(
  Deno.cwd(),
  "src",
  "unfold",
  "schemas",
  "website.schema.json",
);
const DEFAULT_INCLUDE_DOMAINS = [
  "WebSite",
  "CreativeWork",
  "Thing",
];

const parseArgs = (args: string[]): Options => {
  const opts: Options = {
    release: DEFAULT_RELEASE,
    releasesDir: DEFAULT_RELEASES_DIR,
    out: DEFAULT_OUT,
    includeDomains: [...DEFAULT_INCLUDE_DOMAINS],
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg) continue;
    if (arg === "--release") {
      opts.release = args[i + 1] ?? opts.release;
      i += 1;
      continue;
    }
    if (arg === "--releases-dir") {
      opts.releasesDir = args[i + 1] ?? opts.releasesDir;
      i += 1;
      continue;
    }
    if (arg === "--out") {
      opts.out = args[i + 1] ?? opts.out;
      i += 1;
      continue;
    }
    if (arg === "--include-domain") {
      const raw = args[i + 1];
      if (raw) {
        opts.includeDomains = raw.split(",").map((entry) => entry.trim())
          .filter(Boolean);
      }
      i += 1;
      continue;
    }
  }

  return opts;
};

const normalizeDomain = (value: string): string =>
  value.replace(/^https?:\/\/schema\.org\//, "");

const parseList = (value?: string): string[] =>
  (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const isDataType = (value: string): boolean =>
  [
    "Boolean",
    "Date",
    "DateTime",
    "Number",
    "Float",
    "Integer",
    "Text",
    "CssSelectorType",
    "PronounceableText",
    "URL",
    "XPathType",
    "Time",
  ].includes(value);

const schemaForDataType = (value: string): Record<string, unknown> => {
  switch (value) {
    case "Boolean":
      return { type: "boolean" };
    case "Date":
      return { type: "string", format: "date" };
    case "DateTime":
      return { type: "string", format: "date-time" };
    case "Number":
    case "Float":
      return { type: "number" };
    case "Integer":
      return { type: "integer" };
    case "Time":
      return { type: "string", pattern: "^\\d{2}:\\d{2}(:\\d{2})?$" };
    case "CssSelectorType":
    case "PronounceableText":
    case "XPathType":
    case "Text":
    case "URL":
    default:
      return value === "URL"
        ? { type: "string", format: "uri" }
        : { type: "string" };
  }
};

const schemaForRange = (ranges: string[]): Record<string, unknown> => {
  if (ranges.length === 0) {
    return { $ref: "#/definitions/urlOrNodeRef" };
  }

  const options = ranges.map((range) => {
    const normalized = normalizeDomain(range);
    if (isDataType(normalized)) {
      return schemaForDataType(normalized);
    }
    return { $ref: "#/definitions/urlOrNodeRef" };
  });

  const seen = new Map<string, Record<string, unknown>>();
  for (const option of options) {
    const key = "$ref" in option
      ? `ref:${option.$ref as string}`
      : `schema:${JSON.stringify(option)}`;
    if (!seen.has(key)) {
      seen.set(key, option);
    }
  }

  const deduped = Array.from(seen.values());
  if (deduped.length === 1) {
    return deduped[0] ?? { $ref: "#/definitions/urlOrNodeRef" };
  }

  return { oneOf: deduped };
};

const schemaForProperty = (row: CsvRow): Record<string, unknown> => {
  const rangeIncludes = parseList(row.rangeIncludes);
  const baseSchema = schemaForRange(rangeIncludes);
  const description = row.comment ?? "";
  const schema = "$ref" in baseSchema
    ? { allOf: [baseSchema], description }
    : { ...baseSchema, description };
  return {
    oneOf: [
      schema,
      { type: "array", items: schema },
    ],
  };
};

const loadRows = async (path: string): Promise<CsvRow[]> => {
  const content = await Deno.readTextFile(path);
  const records = parse(content) as string[][];
  const header = records.shift();
  if (!header) {
    return [];
  }
  header[0] = header[0]?.replace(/^\uFEFF/, "") ?? "";
  return records.map((row) => {
    const entry: CsvRow = {};
    header.forEach((col, index) => {
      entry[col as keyof CsvRow] = row[index] ?? "";
    });
    return entry;
  });
};

const buildSchema = (rows: CsvRow[], includeDomains: string[]) => {
  const includeSet = new Set(includeDomains);
  const properties: Record<string, unknown> = {};

  for (const row of rows) {
    if (!row.label || !row.domainIncludes) {
      continue;
    }
    const domains = parseList(row.domainIncludes).map(normalizeDomain);
    const matches = domains.some((domain) => includeSet.has(domain));
    if (!matches) {
      continue;
    }
    properties[row.label] = schemaForProperty(row);
  }

  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: "https://example.org/schemas/website.schema.json",
    title: "WebSite",
    description: "Schema.org WebSite profile generated from release data",
    type: "object",
    required: ["@context", "@type", "@id"],
    properties: {
      "@context": {
        description: "JSON-LD context",
        oneOf: [
          { type: "string" },
          { type: "object" },
          { type: "array" },
        ],
      },
      "@type": {
        description: "RDF type of the node",
        type: "string",
        "x-jsonld-type": true,
        enum: ["schema:WebSite", "WebSite"],
      },
      "@id": {
        description: "Unique identifier (IRI) for this site",
        type: "string",
        format: "uri",
        "x-jsonld-id": true,
      },
      ...properties,
    },
    definitions: {
      nodeRef: {
        type: "object",
        required: ["@id"],
        properties: {
          "@id": {
            type: "string",
            format: "uri",
            "x-jsonld-id": true,
          },
        },
      },
      urlOrNodeRef: {
        oneOf: [
          { type: "string", format: "uri" },
          { $ref: "#/definitions/nodeRef" },
        ],
      },
    },
    additionalProperties: false,
  };
};

const run = async (): Promise<void> => {
  const opts = parseArgs(Deno.args);
  const csvPath = join(
    opts.releasesDir,
    opts.release,
    "schemaorg-current-https-properties.csv",
  );
  const rows = await loadRows(csvPath);
  const schema = buildSchema(rows, opts.includeDomains);
  await Deno.writeTextFile(opts.out, JSON.stringify(schema, null, 2));
};

if (import.meta.main) {
  run().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    const encoder = new TextEncoder();
    void Deno.stderr.write(encoder.encode(`${message}\n`));
    Deno.exit(1);
  });
}
