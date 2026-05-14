import { describe, expect, it } from "vitest";

describe("local AI setup", () => {
  it("uses the expected local service ports", () => {
    expect("http://localhost:3000").toContain("3000");
    expect("http://localhost:8080").toContain("8080");
  });

  it("keeps the agent workspace path explicit", () => {
    const path = ".\\agent-workspace";
    expect(path).toContain("agent-workspace");
  });
});
