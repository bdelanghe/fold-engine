export type VaultIndexEntry = {
  path: string;
  sha256: string;
  bytes: number;
  mediaType: string;
};

export type VaultIndex = {
  version: "v1";
  generatedAt: string;
  datasetSha256: string;
  entries: VaultIndexEntry[];
  ref?: {
    sha?: string;
    tag?: string;
    branch?: string;
  };
};

export type VaultMeta = {
  version: "v1";
  generatedAt: string;
  datasetSha256: string;
  entryCount: number;
  policyVersion: "v1";
  ref?: {
    sha?: string;
    tag?: string;
    branch?: string;
  };
};
