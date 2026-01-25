import { validateNotes } from "../inputs/frontmatter/validate.ts";
import { validateVault } from "../inputs/vault/load_vault.ts";

export const runValidate = async (): Promise<void> => {
  // Validate vault structure
  const vaultErrors = await validateVault();
  if (vaultErrors.length > 0) {
    const errorLines = [
      "Vault validation failed:",
      ...vaultErrors.map((error) => `  - ${error}`),
    ];
    const encoder = new TextEncoder();
    await Deno.stderr.write(encoder.encode(`${errorLines.join("\n")}\n`));
    throw new Error("Vault validation failed");
  }

  // Validate note content
  await validateNotes();
};
