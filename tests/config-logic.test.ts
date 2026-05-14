import { describe, expect, it } from "vitest";
import { defaultConfig, mergeConfigUpdate, parseConfig } from "../electron/config-logic";

describe("persisted app config logic", () => {
  it("round-trips saved model labels through config parsing", () => {
    const parsed = parseConfig(
      JSON.stringify({
        openHandsModel: "code-model:latest",
        modelLabels: {
          "private-model:latest": "Internal research assistant"
        }
      })
    );

    expect(parsed.openHandsModel).toBe("code-model:latest");
    expect(parsed.openWebUiChatModel).toBe(defaultConfig.openWebUiChatModel);
    expect(parsed.modelLabels).toEqual({ "private-model:latest": "Internal research assistant" });
  });

  it("strips blank label values when writing a label update", () => {
    const next = mergeConfigUpdate(defaultConfig, {
      modelLabels: {
        "keep-me:latest": "Useful helper",
        "clear-me:latest": ""
      }
    });

    expect(next.modelLabels).toEqual({ "keep-me:latest": "Useful helper" });
  });

  it("preserves existing labels when a model-only update is written", () => {
    const current = {
      ...defaultConfig,
      modelLabels: {
        "private-model:latest": "Internal research assistant"
      }
    };
    const next = mergeConfigUpdate(current, { openWebUiChatModel: "new-chat:latest" });

    expect(next.openWebUiChatModel).toBe("new-chat:latest");
    expect(next.modelLabels).toEqual(current.modelLabels);
  });
});
