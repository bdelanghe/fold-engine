import { assert, assertRejects } from "@std/assert";
import { ValidationError, type VaultNode } from "../inputs/jsonld/types.ts";
import { ORPHAN_REACHABILITY_PREFIX } from "../inputs/jsonld/validator_reachability.ts";
import { runValidate, type ValidationDeps } from "./validate.ts";

const SAMPLE_NODES: VaultNode[] = [
  {
    "@type": "Catalog",
    "@id": "https://example.org/catalog",
    _source: { file: "vault/catalog.jsonld", path: "vault/catalog.jsonld" },
  },
];

const createBaseDeps = (
  overrides: Partial<ValidationDeps> = {},
): Partial<ValidationDeps> => ({
  prepareVault: async () => {},
  getVaultPath: () => "/vault",
  loadVault: async () => ({ nodes: SAMPLE_NODES, errors: [] }),
  validateNodesJsonSchema: async () => [],
  validateNodes: async () => [],
  loadShapes: async () => ({ shapes: [] }),
  validateNodesWithShapes: () => ({ ok: true, violations: [] }),
  formatShaclReport: () => ["SHACL validation failed"],
  validateLinkIntegrity: () => [],
  validateReachability: async () => [],
  emitValidationArtifacts: async () => {},
  writeError: async () => {},
  writeWarning: async () => {},
  ...overrides,
});

Deno.test("runValidate - dev mode warns when no JSON-LD nodes found", async () => {
  const warnings: string[] = [];
  const deps = createBaseDeps({
    loadVault: async () => ({ nodes: [], errors: [] }),
    writeWarning: async (text: string) => {
      warnings.push(text);
    },
  });

  await runValidate({ mode: "dev", deps });

  assert(warnings.length === 1);
  assert(warnings[0].includes("no JSON-LD nodes found"));
});

Deno.test("runValidate - dev mode warns on orphan reachability", async () => {
  const warnings: string[] = [];
  const deps = createBaseDeps({
    validateReachability: async () => [
      new ValidationError(
        `${ORPHAN_REACHABILITY_PREFIX} https://example.org/pages/orphan`,
        "notes/orphan.md",
      ),
    ],
    writeWarning: async (text: string) => {
      warnings.push(text);
    },
  });

  await runValidate({ mode: "dev", deps });

  assert(warnings.length === 1);
  assert(warnings[0].includes("Hint: link it from an index page."));
});

Deno.test("runValidate - strict mode fails on orphan reachability", async () => {
  const deps = createBaseDeps({
    validateReachability: async () => [
      new ValidationError(
        `${ORPHAN_REACHABILITY_PREFIX} https://example.org/pages/orphan`,
        "notes/orphan.md",
      ),
    ],
  });

  await assertRejects(
    () => runValidate({ mode: "strict", deps }),
    Error,
    "Reachability validation failed",
  );
});

Deno.test("runValidate - dev mode still fails on non-orphan reachability", async () => {
  const deps = createBaseDeps({
    validateReachability: async () => [
      new ValidationError(
        "Duplicate basis:cid detected: cid-123",
        "notes/duplicate.md",
      ),
    ],
  });

  await assertRejects(
    () => runValidate({ mode: "dev", deps }),
    Error,
    "Reachability validation failed",
  );
});

Deno.test("runValidate - strict mode runs JSON Schema validation", async () => {
  let called = false;
  const deps = createBaseDeps({
    validateNodesJsonSchema: async () => {
      called = true;
      return [];
    },
  });

  await runValidate({ mode: "strict", deps });

  assert(called);
});
