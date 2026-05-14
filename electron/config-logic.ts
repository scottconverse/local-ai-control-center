export type LocalAIConfig = {
  openHandsModel: string;
  openWebUiChatModel: string;
  openWebUiImage: string;
  modelLabels: Record<string, string>;
};

export const defaultConfig: LocalAIConfig = {
  openHandsModel: "openai/qwen2.5-coder:14b",
  openWebUiChatModel: "gemma4-26b-8k",
  openWebUiImage: "ghcr.io/open-webui/open-webui:v0.9.5",
  modelLabels: {}
};

function cleanStringEntries(value: unknown) {
  if (!value || typeof value !== "object") {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0)
  );
}

export function parseConfig(raw: string, fallback: LocalAIConfig = defaultConfig): LocalAIConfig {
  try {
    const parsed = JSON.parse(raw) as Partial<LocalAIConfig>;
    return {
      ...fallback,
      ...cleanStringEntries(parsed),
      modelLabels: cleanStringEntries(parsed.modelLabels)
    };
  } catch {
    return fallback;
  }
}

export function mergeConfigUpdate(current: LocalAIConfig, update: Partial<LocalAIConfig>): LocalAIConfig {
  return {
    ...current,
    ...cleanStringEntries(update),
    modelLabels: update.modelLabels ? cleanStringEntries(update.modelLabels) : current.modelLabels
  };
}
