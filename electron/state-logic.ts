export type SetupMemory = {
  version: number;
  setupComplete: boolean;
  completedAt: string;
};

export function parseSetupMemory(raw: string, expectedVersion: number): SetupMemory | null {
  try {
    const parsed = JSON.parse(raw) as Partial<SetupMemory>;
    return parsed.version === expectedVersion && parsed.setupComplete === true && typeof parsed.completedAt === "string"
      ? {
          version: parsed.version,
          setupComplete: true,
          completedAt: parsed.completedAt
        }
      : null;
  } catch {
    return null;
  }
}
