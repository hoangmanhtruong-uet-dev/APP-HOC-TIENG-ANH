import { describe, expect, it } from "vitest";
import { formatSkillLabel, getLevelBadge } from "./model";

describe("course plans model", () => {
  it("formats skill labels accurately", () => {
    expect(formatSkillLabel("dictation")).toBe("Dictation (Chép chính tả)");
    expect(formatSkillLabel("writing")).toBe("Writing AI Chấm chữa");
    expect(formatSkillLabel("mock_test")).toBe("Mock Test Kiểm tra");
  });

  it("returns level badges for all levels", () => {
    expect(getLevelBadge("stage_1")?.label).toContain("Foundation");
    expect(getLevelBadge("stage_2")?.label).toContain("Elementary");
    expect(getLevelBadge("stage_3")?.label).toContain("Pre-IELTS");
    expect(getLevelBadge("stage_4")?.label).toContain("Intermediate");
    expect(getLevelBadge("stage_5")?.label).toContain("Upper-Inter");
    expect(getLevelBadge("stage_6")?.label).toContain("Advanced");
  });
});
