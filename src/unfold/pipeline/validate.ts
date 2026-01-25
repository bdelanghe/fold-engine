import { prepareVault } from "../inputs/vault/prepare_vault.ts";
import { getVaultPath, loadVault } from "../inputs/jsonld/loader.ts";
import { validateLinkIntegrity } from "../inputs/jsonld/validator_links.ts";
import { validateNodes } from "../inputs/jsonld/validator_zod.ts";
import { loadShapes } from "../shacl/loader.ts";
import {
  formatShaclReport,
  validateNodesWithShapes,
} from "../shacl/validator.ts";

type ValidationMode = "strict" | "dev";

const getValidationMode = (): ValidationMode => {
  const raw = Deno.env.get("UNFOLD_VALIDATE_MODE")?.toLowerCase();
  return raw === "strict" ? "strict" : "dev";
};

export const runValidate = async (): Promise<void> => {
  const mode = getValidationMode();
  await prepareVault();
  const vaultPath = getVaultPath();
  const { nodes, errors } = await loadVault(vaultPath);
  if (errors.length > 0) {
    const errorLines = [
      "JSON-LD load failed:",
      ...errors.map((error) => `  - ${error.file}: ${error.message}`),
    ];
    const encoder = new TextEncoder();
    await Deno.stderr.write(encoder.encode(`${errorLines.join("\n")}\n`));
    throw new Error("JSON-LD load failed");
  }

  const schemaErrors = await validateNodes(nodes);
  if (schemaErrors.length > 0) {
    const errorLines = [
      "JSON-LD schema validation failed:",
      ...schemaErrors.map((error) => `  - ${error.file}: ${error.message}`),
    ];
    const encoder = new TextEncoder();
    await Deno.stderr.write(encoder.encode(`${errorLines.join("\n")}\n`));
    throw new Error("JSON-LD schema validation failed");
  }

  const shapes = await loadShapes();
  const report = validateNodesWithShapes(nodes, shapes.shapes);
  if (!report.ok) {
    const errorLines = formatShaclReport(report);
    const encoder = new TextEncoder();
    await Deno.stderr.write(encoder.encode(`${errorLines.join("\n")}\n`));
    throw new Error("SHACL validation failed");
  }

  const linkErrors = validateLinkIntegrity(nodes);
  if (linkErrors.length > 0) {
    const errorLines = [
      `Link integrity validation failed (mode: ${mode}):`,
      ...linkErrors.map((error) => `  - ${error.file}: ${error.message}`),
    ];
    const encoder = new TextEncoder();
    await Deno.stderr.write(encoder.encode(`${errorLines.join("\n")}\n`));
    throw new Error("Link integrity validation failed");
  }
};
