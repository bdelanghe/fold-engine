import { posix } from "@std/path";

export const sanitizeVaultPath = (input: string): string => {
  if (!input) {
    throw new Error("Vault path is empty");
  }
  if (input.includes("\\")) {
    throw new Error("Vault path contains backslashes");
  }
  if (input.startsWith("/")) {
    throw new Error("Vault path must be relative");
  }
  const normalized = posix.normalize(input);
  if (
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../") ||
    normalized.startsWith("/")
  ) {
    throw new Error("Vault path contains traversal");
  }
  if (normalized.split("/").some((segment) => segment.length === 0)) {
    throw new Error("Vault path contains empty segments");
  }
  return normalized;
};

export const encodeVaultPath = (input: string): string =>
  input.split("/").map((segment) => encodeURIComponent(segment)).join("/");
