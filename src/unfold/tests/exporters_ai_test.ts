import { assert, assertEquals } from "@std/assert";

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

Deno.test("exports llms.txt and mcp bundle", async () => {
  if (!await hasRequiredPermissions()) {
    console.warn("Skipping AI export test (missing permissions).");
    return;
  }
  await runBuild();

  const llms = await Deno.readTextFile("dist/site/llms.txt");
  assert(llms.includes("allow:"), "Missing allow directive");
  assert(
    llms.split("\n").some((line) => line.startsWith("index: ")),
    "Missing index directive",
  );

  const mcpRaw = await Deno.readTextFile("dist/site/mcp/site.json");
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
