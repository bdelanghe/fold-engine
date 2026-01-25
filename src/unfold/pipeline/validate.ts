import { prepareVault } from "../inputs/vault/prepare_vault.ts";
import { getVaultPath, loadVault } from "../inputs/jsonld/loader.ts";
import { validateLinkIntegrity } from "../inputs/jsonld/validator_links.ts";
import {
  ORPHAN_REACHABILITY_PREFIX,
  validateReachability,
} from "../inputs/jsonld/validator_reachability.ts";
import { validateNodes as validateNodesJsonSchema } from "../inputs/jsonld/validator.ts";
import { validateNodes } from "../inputs/jsonld/validator_zod.ts";
import { loadShapes } from "../shacl/loader.ts";
import {
  formatShaclReport,
  validateNodesWithShapes,
} from "../shacl/validator.ts";
import { join } from "@std/path";

export type ValidationMode = "strict" | "dev";

export type ValidationDeps = {
  prepareVault: typeof prepareVault;
  getVaultPath: typeof getVaultPath;
  loadVault: typeof loadVault;
  validateNodesJsonSchema: typeof validateNodesJsonSchema;
  validateNodes: typeof validateNodes;
  loadShapes: typeof loadShapes;
  validateNodesWithShapes: typeof validateNodesWithShapes;
  formatShaclReport: typeof formatShaclReport;
  validateLinkIntegrity: typeof validateLinkIntegrity;
  validateReachability: typeof validateReachability;
  emitValidationArtifacts: (mode: ValidationMode) => Promise<void>;
  writeError: (text: string) => Promise<void>;
  writeWarning: (text: string) => Promise<void>;
};

export type RunValidateOptions = {
  mode?: ValidationMode;
  deps?: Partial<ValidationDeps>;
};

const getValidationMode = (): ValidationMode => {
  const raw = Deno.env.get("UNFOLD_VALIDATE_MODE")?.toLowerCase();
  return raw === "strict" ? "strict" : "dev";
};

const writeToStream = async (
  stream: { write: (value: Uint8Array) => Promise<number> },
  text: string,
): Promise<void> => {
  const encoder = new TextEncoder();
  const normalized = text.endsWith("\n") ? text : `${text}\n`;
  await stream.write(encoder.encode(normalized));
};

const emitValidationArtifacts = async (): Promise<void> => {
  const root = join(Deno.cwd(), "dist", "unfold", "validation");
  const schemaOutput = join(root, "schemas");
  const shaclOutput = join(root, "shacl");
  await Deno.mkdir(schemaOutput, { recursive: true });
  await Deno.mkdir(shaclOutput, { recursive: true });

  const schemaSource = join(Deno.cwd(), "src", "unfold", "schemas");
  for await (const entry of Deno.readDir(schemaSource)) {
    if (!entry.isFile || !entry.name.endsWith(".json")) {
      continue;
    }
    await Deno.copyFile(
      join(schemaSource, entry.name),
      join(schemaOutput, entry.name),
    );
  }

  await Deno.copyFile(
    join(Deno.cwd(), "src", "unfold", "shacl", "shapes.json"),
    join(shaclOutput, "shapes.json"),
  );
};

export const runValidate = async (
  options: RunValidateOptions = {},
): Promise<void> => {
  const mode = options.mode ?? getValidationMode();
  const deps: ValidationDeps = {
    prepareVault,
    getVaultPath,
    loadVault,
    validateNodesJsonSchema,
    validateNodes,
    loadShapes,
    validateNodesWithShapes,
    formatShaclReport,
    validateLinkIntegrity,
    validateReachability,
    emitValidationArtifacts: async (mode) => {
      if (mode === "strict") {
        await emitValidationArtifacts();
      }
    },
    writeError: (text) => writeToStream(Deno.stderr, text),
    writeWarning: (text) => writeToStream(Deno.stderr, text),
    ...options.deps,
  };

  await deps.prepareVault();
  const vaultPath = deps.getVaultPath();
  const { nodes, errors } = await deps.loadVault(vaultPath);
  if (errors.length > 0) {
    const errorLines = [
      "JSON-LD load failed:",
      ...errors.map((error) => `  - ${error.file}: ${error.message}`),
    ];
    await deps.writeError(errorLines.join("\n"));
    throw new Error("JSON-LD load failed");
  }

  if (mode === "strict") {
    const jsonSchemaErrors = await deps.validateNodesJsonSchema(nodes);
    if (jsonSchemaErrors.length > 0) {
      const errorLines = [
        "JSON-LD JSON Schema validation failed:",
        ...jsonSchemaErrors.map((error) =>
          `  - ${error.file}: ${error.message}`
        ),
      ];
      await deps.writeError(errorLines.join("\n"));
      throw new Error("JSON-LD JSON Schema validation failed");
    }
  }

  const schemaErrors = await deps.validateNodes(nodes);
  if (schemaErrors.length > 0) {
    const errorLines = [
      "JSON-LD schema validation failed:",
      ...schemaErrors.map((error) => `  - ${error.file}: ${error.message}`),
    ];
    await deps.writeError(errorLines.join("\n"));
    throw new Error("JSON-LD schema validation failed");
  }

  const shapes = await deps.loadShapes();
  const report = deps.validateNodesWithShapes(nodes, shapes.shapes);
  if (!report.ok) {
    const errorLines = deps.formatShaclReport(report);
    await deps.writeError(errorLines.join("\n"));
    throw new Error("SHACL validation failed");
  }

  const linkErrors = deps.validateLinkIntegrity(nodes);
  if (linkErrors.length > 0) {
    const errorLines = [
      `Link integrity validation failed (mode: ${mode}):`,
      ...linkErrors.map((error) => `  - ${error.file}: ${error.message}`),
    ];
    await deps.writeError(errorLines.join("\n"));
    throw new Error("Link integrity validation failed");
  }

  const reachabilityErrors = await deps.validateReachability(nodes);
  if (reachabilityErrors.length > 0) {
    const isOrphanOnly = reachabilityErrors.every((error) =>
      error.message.startsWith(ORPHAN_REACHABILITY_PREFIX)
    );
    if (mode === "dev" && isOrphanOnly) {
      const warningLines = [
        `Reachability warning (mode: ${mode}):`,
        ...reachabilityErrors.map((error) =>
          `  - ${error.file}: ${error.message}`
        ),
        "Hint: link it from an index page.",
      ];
      await deps.writeWarning(warningLines.join("\n"));
      return;
    }
    const errorLines = [
      `Reachability validation failed (mode: ${mode}):`,
      ...reachabilityErrors.map((error) =>
        `  - ${error.file}: ${error.message}`
      ),
    ];
    await deps.writeError(errorLines.join("\n"));
    throw new Error("Reachability validation failed");
  }

  await deps.emitValidationArtifacts(mode);
};
