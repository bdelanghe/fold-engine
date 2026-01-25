import { validateNotes } from "../inputs/frontmatter/validate.ts";
import { validateVault } from "../inputs/vault/load_vault.ts";

export const runValidate = async (): Promise<void> => {
  // Validate vault structure
  const vaultErrors = await validateVault();
  if (vaultErrors.length > 0) {
    console.error("Vault validation failed:");
    for (const error of vaultErrors) {
      console.error(`  - ${error}`);
    }
    throw new Error("Vault validation failed");
  }

  // Validate note content
  await validateNotes();
};
