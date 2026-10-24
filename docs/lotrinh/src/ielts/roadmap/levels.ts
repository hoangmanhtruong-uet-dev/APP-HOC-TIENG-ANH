import type { IELTSLevelId, BandRange } from "../types/common";
export interface RoadmapLevel { id: IELTSLevelId; title: string; band: BandRange; recommendedWeeks: number; weeklyHours: number; checkpointEveryWeeks: number; }
export const IELTS_LEVELS: RoadmapLevel[] = [
  { id: "starter-0-2.5", title: "Starter — mất gốc", band: { from: 0, to: 2.5 }, recommendedWeeks: 12, weeklyHours: 8, checkpointEveryWeeks: 2 },
  { id: "elementary-2.5-3.5", title: "Elementary", band: { from: 2.5, to: 3.5 }, recommendedWeeks: 10, weeklyHours: 8, checkpointEveryWeeks: 2 },
  { id: "pre-ielts-3.5-4.5", title: "Pre-IELTS", band: { from: 3.5, to: 4.5 }, recommendedWeeks: 10, weeklyHours: 8, checkpointEveryWeeks: 2 },
  { id: "foundation-4.5-5.5", title: "Foundation", band: { from: 4.5, to: 5.5 }, recommendedWeeks: 10, weeklyHours: 10, checkpointEveryWeeks: 2 },
  { id: "intermediate-5.5-6.5", title: "Intermediate", band: { from: 5.5, to: 6.5 }, recommendedWeeks: 12, weeklyHours: 10, checkpointEveryWeeks: 2 },
  { id: "upper-6.5-7.5", title: "Upper-Intermediate", band: { from: 6.5, to: 7.5 }, recommendedWeeks: 12, weeklyHours: 12, checkpointEveryWeeks: 2 },
  { id: "advanced-7.5-8.5", title: "Advanced", band: { from: 7.5, to: 8.5 }, recommendedWeeks: 12, weeklyHours: 12, checkpointEveryWeeks: 2 },
  { id: "expert-8.5-9.0", title: "Expert", band: { from: 8.5, to: 9 }, recommendedWeeks: 12, weeklyHours: 12, checkpointEveryWeeks: 2 },
];
