import { prepareVault } from "./inputs/vault/prepare_vault.ts";
import { createSite } from "./site/site.ts";

const resolvePort = () => {
  const rawPort = Deno.env.get("PORT") ?? "3000";
  const port = Number.parseInt(rawPort, 10);
  return Number.isNaN(port) ? 3000 : port;
};

const startServer = async () => {
  await prepareVault();
  const site = createSite();
  await site.build();
  const server = site.getServer();
  server.options.hostname = "0.0.0.0";
  server.options.port = resolvePort();
  await server.start();
  await new Promise(() => {});
};

const run = async (): Promise<void> => {
  try {
    await startServer();
  } catch (error) {
    if (error instanceof Deno.errors.AddrInUse) {
      throw new Error(
        `Dev server port ${resolvePort()} is already in use. Stop the other server or choose a different port.`,
      );
    }
    throw error;
  }
};

if (import.meta.main) {
  void run();
}
