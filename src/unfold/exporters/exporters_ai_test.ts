import { assert, assertEquals } from "@std/assert";
import { scanVault } from "../inputs/vault/load_vault.ts";

const hasRequiredPermissions = async (): Promise<boolean> => {
  const required: Deno.PermissionDescriptor[] = [
    { name: "read" },
    { name: "write" },
    { name: "run" },
    { name: "env" },
  ];
  for (const permission of required) {
    const status = await Deno.permissions.query(permission);
    if (status.state !== "granted") {
      return false;
    }
  }
  return true;
};

const hasVaultContent = async (): Promise<boolean> => {
  const manifest = await scanVault();
  if (!manifest.hasConfig || manifest.files.length === 0) {
    console.warn("Skipping AI export test (missing vault content).");
    return false;
  }
  return true;
};

const runBuild = async () => {
  const command = new Deno.Command(Deno.execPath(), {
    args: ["task", "build:site"],
  });
  const result = await command.output();
  if (result.code !== 0) {
    const decoder = new TextDecoder();
    const stdout = decoder.decode(result.stdout);
    const stderr = decoder.decode(result.stderr);
    throw new Error(
      `Build failed (code ${result.code}).\n${stdout}\n${stderr}`.trim(),
    );
  }
};

const getSiteDir = (): string =>
  Deno.env.get("SITE_OUTPUT_DIR")?.trim() || ".unfold/site";

Deno.test("exports llms.txt and mcp bundle", async () => {
  if (!await hasRequiredPermissions()) {
    console.warn("Skipping AI export test (missing permissions).");
    return;
  }
  if (!await hasVaultContent()) {
    return;
  }
  await runBuild();
  const siteDir = getSiteDir();

  const llms = await Deno.readTextFile(`${siteDir}/llms.txt`);
  assert(llms.includes("allow:"), "Missing allow directive");
  assert(
    llms.split("\n").some((line) => line.startsWith("index: ")),
    "Missing index directive",
  );

  const mcpRaw = await Deno.readTextFile(`${siteDir}/mcp/site.json`);
  const mcp = JSON.parse(mcpRaw) as {
    version?: string;
    generatedAt?: string;
    site?: { url?: string };
    pages?: Array<{
      url?: string;
      title?: string;
      excerpt?: string;
      headings?: unknown[];
    }>;
  };
  assertEquals(mcp.version, "v1");
  assert(typeof mcp.generatedAt === "string");
  assert(typeof mcp.site?.url === "string");
  assert(Array.isArray(mcp.pages) && mcp.pages.length > 0);
  const firstPage = mcp.pages[0];
  assert(typeof firstPage?.url === "string");
  assert(typeof firstPage?.title === "string");
  assert(typeof firstPage?.excerpt === "string");
  assert(Array.isArray(firstPage?.headings));
});
