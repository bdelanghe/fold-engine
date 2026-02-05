const DEFAULT_SITE_PORT = "3000";

export type SiteBuildConfig = {
  siteUrl: string;
};

const requireSiteUrl = (): string => {
  const raw = Deno.env.get("SITE_URL")?.trim();
  if (!raw) {
    const port = Deno.env.get("PORT")?.trim() || DEFAULT_SITE_PORT;
    const suggested = `http://localhost:${port}`;
    throw new Error(
      `SITE_URL is required (e.g. ${suggested} or your deploy URL).`,
    );
  }
  return raw;
};

export const siteBuildConfig: SiteBuildConfig = {
  siteUrl: requireSiteUrl(),
};
