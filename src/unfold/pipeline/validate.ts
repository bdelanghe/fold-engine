import { prepareVault } from "../inputs/vault/prepare_vault.ts";
import { getVaultPath, loadVault } from "../inputs/jsonld/loader.ts";
import { validateNodes } from "../inputs/jsonld/validator_zod.ts";
import { loadShapes } from "../shacl/loader.ts";
import { formatShaclReport, validateNodesWithShapes } from "../shacl/validator.ts";

export const runValidate = async (): Promise<void> => {
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
};
