import { LISTENING_CURRICULUM } from "../../docs/lotrinh/src/ielts/listening/curriculum";
import { LISTENING_PRACTICE_BANK } from "../../docs/lotrinh/src/ielts/listening/practice-index";
import { READING_CURRICULUM } from "../../docs/lotrinh/src/ielts/reading/curriculum";
import { READING_PRACTICE_BANK } from "../../docs/lotrinh/src/ielts/reading/practice-index";
import { IELTS_LEVELS } from "../../docs/lotrinh/src/ielts/roadmap/levels";
import { SPEAKING_CURRICULUM } from "../../docs/lotrinh/src/ielts/speaking/curriculum";
import { SPEAKING_PRACTICE_BANK } from "../../docs/lotrinh/src/ielts/speaking/practice-index";
import type {
  IELTSLevelId,
  IELTSSkill,
} from "../../docs/lotrinh/src/ielts/types/common";
import type {
  IELTSLesson,
  SkillStage,
} from "../../docs/lotrinh/src/ielts/types/lesson";
import { WRITING_CURRICULUM } from "../../docs/lotrinh/src/ielts/writing/curriculum";
import { WRITING_PRACTICE_BANK } from "../../docs/lotrinh/src/ielts/writing/practice-index";

export type { IELTSLevelId, IELTSLesson, IELTSSkill, SkillStage };

export const ROADMAP_SKILLS: IELTSSkill[] = [
  "listening",
  "reading",
  "writing",
  "speaking",
];

export const ROADMAP_SKILL_LABELS: Record<IELTSSkill, string> = {
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
  speaking: "Speaking",
};

export const ROADMAP_SKILL_DESCRIPTIONS: Record<IELTSSkill, string> = {
  listening: "Nghe có chiến lược, nhận diện paraphrase và kiểm soát bẫy.",
  reading: "Đọc tìm bằng chứng, xử lý từng dạng câu hỏi và quản lý thời gian.",
  writing:
    "Phát triển ý, tổ chức bài và kiểm soát ngôn ngữ theo tiêu chí band.",
  speaking: "Mở rộng câu trả lời, tăng độ trôi chảy và cải thiện phát âm.",
};

const CURRICULA: Record<IELTSSkill, SkillStage[]> = {
  listening: LISTENING_CURRICULUM,
  reading: READING_CURRICULUM,
  writing: WRITING_CURRICULUM,
  speaking: SPEAKING_CURRICULUM,
};

const PRACTICE_BANKS = {
  listening: LISTENING_PRACTICE_BANK,
  reading: READING_PRACTICE_BANK,
  writing: WRITING_PRACTICE_BANK,
  speaking: SPEAKING_PRACTICE_BANK,
} as const;

export type RoadmapPractice =
  | (typeof LISTENING_PRACTICE_BANK)[number]
  | (typeof READING_PRACTICE_BANK)[number]
  | (typeof WRITING_PRACTICE_BANK)[number]
  | (typeof SPEAKING_PRACTICE_BANK)[number];

export function isRoadmapSkill(value: string): value is IELTSSkill {
  return ROADMAP_SKILLS.some((skill) => skill === value);
}

export function isRoadmapLevel(value: string): value is IELTSLevelId {
  return IELTS_LEVELS.some((level) => level.id === value);
}

export function getRoadmapLevel(levelId: IELTSLevelId) {
  return IELTS_LEVELS.find((level) => level.id === levelId) ?? null;
}

export function getRecommendedLevel(band: number | null): IELTSLevelId {
  if (band === null) return IELTS_LEVELS[0].id;
  return (
    IELTS_LEVELS.find(
      (level) => band >= level.band.from && band < level.band.to,
    )?.id ?? IELTS_LEVELS.at(-1)!.id
  );
}

export function getSkillStage(
  levelId: IELTSLevelId,
  skill: IELTSSkill,
): SkillStage | null {
  return CURRICULA[skill].find((stage) => stage.id === levelId) ?? null;
}

export function getRoadmapLesson(
  levelId: IELTSLevelId,
  skill: IELTSSkill,
  lessonId: string,
): IELTSLesson | null {
  return (
    getSkillStage(levelId, skill)?.lessons.find(
      (lesson) => lesson.id === lessonId,
    ) ?? null
  );
}

export function getRoadmapPractice(
  levelId: IELTSLevelId,
  skill: IELTSSkill,
): RoadmapPractice | null {
  return (
    PRACTICE_BANKS[skill].find((practice) => practice.levelId === levelId) ??
    null
  );
}

export { IELTS_LEVELS };
