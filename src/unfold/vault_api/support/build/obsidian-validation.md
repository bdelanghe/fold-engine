---
aliases: [Vault Build, Validation]
---

# Obsidian Vault Build Notes

## Validation status

- **build** — ensure `vault/` structure is recognized and `.obsidian/` config exists.  
- Vault validator error: “Missing `.obsidian/` configuration folder / Vault contains no valid files”.
- This repository now contains a minimal `.obsidian/` folder plus several `*.md` notes at the root.

## Next steps

- Sync these notes with `vault/templates/standard-note.md` before running any automated observation.  
- Keep `build/` references up to date as the validator changes; consider automation (e.g., `npm run build`) if a formal build step emerges.
