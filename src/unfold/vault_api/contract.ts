export type VaultIndexEntry = {
  path: string;
  sha256: string;
  bytes: number;
  mediaType: string;
};

export type VaultIndex = {
  version: "v1";
  generatedAt: string;
  entries: VaultIndexEntry[];
  ref?: {
    sha?: string;
    tag?: string;
    branch?: string;
  };
};
