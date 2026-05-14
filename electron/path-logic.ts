import path from "node:path";

export function appRootCandidates(dirname: string): string[] {
  return [
    path.resolve(dirname, "..", ".."),
    path.resolve(dirname, ".."),
    path.resolve(dirname)
  ];
}

export function resolveAppRoot(dirname: string, exists: (candidate: string) => boolean, override?: string): string {
  if (override && exists(override)) {
    return override;
  }
  const found = appRootCandidates(dirname).find(exists);
  return found ?? path.resolve(dirname, "..");
}
