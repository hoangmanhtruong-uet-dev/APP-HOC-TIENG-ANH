export type IELTSBand = 0 | 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5 | 5.5 | 6 | 6.5 | 7 | 7.5 | 8 | 8.5 | 9;
export type IELTSLevelId =
  | "starter-0-2.5"
  | "elementary-2.5-3.5"
  | "pre-ielts-3.5-4.5"
  | "foundation-4.5-5.5"
  | "intermediate-5.5-6.5"
  | "upper-6.5-7.5"
  | "advanced-7.5-8.5"
  | "expert-8.5-9.0";
export type IELTSSkill = "listening" | "reading" | "writing" | "speaking";
export type Difficulty = "starter" | "easy" | "medium" | "hard" | "expert";

export interface BandRange { from: IELTSBand; to: IELTSBand; }
export interface SourceRef { title: string; url: string; note: string; }
export interface StudyTime { lessonMinutes: number; selfStudyMinutes: number; sessionsPerWeek: number; weeks: number; }
