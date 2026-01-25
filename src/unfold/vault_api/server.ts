import { walk } from "@std/fs";
import { fromFileUrl, join, relative } from "@std/path";
import { loadVaultRoot } from "../inputs/vault/load_vault.ts";
import type { VaultIndex, VaultIndexEntry } from "./contract.ts";
import { sanitizeVaultPath } from "./path.ts";

const getVaultRootPath = (): string => fromFileUrl(loadVaultRoot());

const resolvePort = (): number => {
  const raw = Deno.env.get("PORT") ?? Deno.env.get("VAULT_API_PORT") ?? "7777";
  const port = Number.parseInt(raw, 10);
  return Number.isNaN(port) ? 7777 : port;
};

const getVaultRef = (): VaultIndex["ref"] => {
  const sha = Deno.env.get("VAULT_SHA")?.trim();
  const tag = Deno.env.get("VAULT_TAG")?.trim();
  const branch = Deno.env.get("VAULT_BRANCH")?.trim();
  if (!sha && !tag && !branch) {
    return undefined;
  }
  return { sha: sha || undefined, tag: tag || undefined, branch: branch || undefined };
};

const shouldSkipPath = (relPath: string): boolean => {
  if (!relPath) {
    return true;
  }
  if (relPath === ".git" || relPath.startsWith(".git/")) {
    return true;
  }
  if (relPath.startsWith("_includes/")) {
    return true;
  }
  if (relPath.startsWith(".") && !relPath.startsWith(".obsidian/") && relPath !== ".obsidian") {
    return true;
  }
  return false;
};

const getMediaType = (path: string): string => {
  const ext = path.includes(".") ? path.slice(path.lastIndexOf(".")).toLowerCase() : "";
  switch (ext) {
    case ".md":
      return "text/markdown; charset=utf-8";
    case ".json":
    case ".canvas":
    case ".base":
      return "application/json; charset=utf-8";
    case ".yml":
    case ".yaml":
      return "text/yaml; charset=utf-8";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    case ".webp":
      return "image/webp";
    case ".bmp":
      return "image/bmp";
    case ".avif":
      return "image/avif";
    case ".pdf":
      return "application/pdf";
    case ".mp3":
      return "audio/mpeg";
    case ".m4a":
      return "audio/mp4";
    case ".ogg":
      return "audio/ogg";
    case ".wav":
      return "audio/wav";
    case ".flac":
      return "audio/flac";
    case ".webm":
      return "video/webm";
    case ".mp4":
      return "video/mp4";
    case ".mkv":
      return "video/x-matroska";
    case ".mov":
      return "video/quicktime";
    case ".ogv":
      return "video/ogg";
    case ".3gp":
      return "video/3gpp";
    default:
      return "application/octet-stream";
  }
};

const sha256Hex = async (data: Uint8Array): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const buildIndex = async (): Promise<VaultIndex> => {
  const rootPath = getVaultRootPath();
  const entries: VaultIndexEntry[] = [];

  for await (const entry of walk(rootPath, { includeDirs: false })) {
    const relPath = relative(rootPath, entry.path);
    if (shouldSkipPath(relPath)) {
      continue;
    }
    const bytes = await Deno.readFile(entry.path);
    const sha256 = await sha256Hex(bytes);
    entries.push({
      path: relPath,
      sha256,
      bytes: bytes.byteLength,
      mediaType: getMediaType(relPath),
    });
  }

  entries.sort((a, b) => a.path.localeCompare(b.path));

  return {
    version: "v1",
    generatedAt: new Date().toISOString(),
    entries,
    ref: getVaultRef(),
  };
};

const respondJson = (value: unknown, status = 200): Response =>
  new Response(JSON.stringify(value, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const handleFileRequest = async (request: Request, relPath: string): Promise<Response> => {
  if (shouldSkipPath(relPath)) {
    return new Response("Not found", { status: 404 });
  }
  const rootPath = getVaultRootPath();
  const filePath = join(rootPath, relPath);
  try {
    const bytes = await Deno.readFile(filePath);
    const sha256 = await sha256Hex(bytes);
    const etag = `"${sha256}"`;
    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new Response(null, { status: 304 });
    }
    return new Response(bytes, {
      status: 200,
      headers: {
        "content-type": getMediaType(relPath),
        etag,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return new Response("Not found", { status: 404 });
    }
    return new Response("Failed to read file", { status: 500 });
  }
};

const handler = async (request: Request): Promise<Response> => {
  const url = new URL(request.url);

  if (url.pathname === "/healthz") {
    return new Response("ok\n");
  }

  if (url.pathname === "/v1/index") {
    const index = await buildIndex();
    return respondJson(index);
  }

  if (url.pathname.startsWith("/v1/files/")) {
    const encodedPath = url.pathname.slice("/v1/files/".length);
    try {
      const decodedPath = decodeURIComponent(encodedPath);
      const relPath = sanitizeVaultPath(decodedPath);
      return await handleFileRequest(request, relPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid path";
      return new Response(message, { status: 400 });
    }
  }

  return new Response("Not found", { status: 404 });
};

if (import.meta.main) {
  Deno.serve({ port: resolvePort(), hostname: "0.0.0.0" }, handler);
}
