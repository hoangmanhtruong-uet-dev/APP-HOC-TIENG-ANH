import { describe, expect, it } from "vitest";

import { getStarterWeeks } from "@/content/starter-roadmap";

import {
  getRecommendedLevel,
  getRoadmapLesson,
  getRoadmapPractice,
  getSkillStage,
  IELTS_LEVELS,
  ROADMAP_SKILLS,
} from "@/content/ielts-roadmap";

describe("IELTS roadmap content", () => {
  it("exposes eight complete stages for all four skills", () => {
    expect(IELTS_LEVELS).toHaveLength(8);

    for (const level of IELTS_LEVELS) {
      for (const skill of ROADMAP_SKILLS) {
        const stage = getSkillStage(level.id, skill);
        expect(stage?.lessons).toHaveLength(6);
        expect(getRoadmapPractice(level.id, skill)).not.toBeNull();
      }
    }
  });

  it("finds a lesson by its stable curriculum id", () => {
    const stage = getSkillStage("foundation-4.5-5.5", "reading");
    const lesson = stage?.lessons[0];

    expect(lesson).toBeDefined();
    expect(
      getRoadmapLesson("foundation-4.5-5.5", "reading", lesson!.id),
    ).toEqual(lesson);
  });

  it("builds a detailed twelve-week Starter plan with every core lesson", () => {
    const weeks = getStarterWeeks();
    const lessons = weeks.flatMap((week) => week.lessons);

    expect(weeks).toHaveLength(12);
    expect(lessons).toHaveLength(24);
    expect(new Set(lessons.map((lesson) => lesson.lesson.id)).size).toBe(24);
    expect(
      lessons.filter((lesson) => lesson.skill === "listening"),
    ).toHaveLength(6);
    expect(lessons.filter((lesson) => lesson.skill === "reading")).toHaveLength(
      6,
    );
    expect(lessons.filter((lesson) => lesson.skill === "writing")).toHaveLength(
      6,
    );
    expect(
      lessons.filter((lesson) => lesson.skill === "speaking"),
    ).toHaveLength(6);
  });
  it("selects a recommended stage from the learner band", () => {
    expect(getRecommendedLevel(null)).toBe("starter-0-2.5");
    expect(getRecommendedLevel(5.5)).toBe("intermediate-5.5-6.5");
    expect(getRecommendedLevel(9)).toBe("expert-8.5-9.0");
  });
});
