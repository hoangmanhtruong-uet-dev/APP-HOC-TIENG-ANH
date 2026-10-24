import type { Difficulty, IELTSBand, IELTSLevelId, IELTSSkill, StudyTime } from "./common";

export interface LessonExercise {
  id: string;
  title: string;
  instruction: string;
  expectedOutput: string;
  estimatedMinutes: number;
  difficulty: Difficulty;
  answerKey?: string[];
  selfCheck?: string[];
}

export interface IELTSLesson {
  id: string;
  skill: IELTSSkill;
  levelId: IELTSLevelId;
  targetBand: IELTSBand;
  order: number;
  title: string;
  learningObjectives: string[];
  teachingPoints: string[];
  teacherFlow: string[];
  guidedPractice: LessonExercise[];
  independentPractice: LessonExercise[];
  homework: LessonExercise[];
  masteryChecks: string[];
  commonErrors: string[];
  remediation: string[];
  estimatedMinutes: number;
  tags: string[];
}

export interface SkillStage {
  id: IELTSLevelId;
  title: string;
  skill: IELTSSkill;
  entryBand: IELTSBand;
  targetBand: IELTSBand;
  prerequisites: string[];
  outcomes: string[];
  studyTime: StudyTime;
  lessons: IELTSLesson[];
  exitTest: string[];
}
