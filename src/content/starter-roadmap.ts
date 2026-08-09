import type { IELTSLesson, IELTSSkill } from "@/content/ielts-roadmap";
import { getRoadmapLesson } from "@/content/ielts-roadmap";

export type StarterWeek = {
  week: number;
  title: string;
  focus: string;
  outcome: string;
  lessons: Array<{
    skill: IELTSSkill;
    lesson: IELTSLesson;
  }>;
};

const STARTER_WEEK_SLOTS: Array<{
  title: string;
  focus: string;
  outcome: string;
  slots: Array<{ skill: IELTSSkill; order: number }>;
}> = [
  {
    title: "Làm quen với tiếng Anh học thuật",
    focus: "Âm cơ bản, bảng chữ cái, câu đơn và phản xạ giới thiệu",
    outcome:
      "Đọc được câu ngắn, nghe được thông tin cá nhân cơ bản và nói một câu hoàn chỉnh.",
    slots: [
      { skill: "listening", order: 1 },
      { skill: "reading", order: 1 },
    ],
  },
  {
    title: "Dựng câu đầu tiên",
    focus: "Câu SVO, punctuation, giới thiệu bản thân và trả lời ngắn",
    outcome:
      "Viết và nói được câu SVO đúng trật tự, không còn trả lời bằng từ đơn.",
    slots: [
      { skill: "writing", order: 1 },
      { skill: "speaking", order: 1 },
    ],
  },
  {
    title: "Bắt từ khóa và tìm bằng chứng",
    focus: "Form/note completion, True/False/Not Given và paraphrase cơ bản",
    outcome:
      "Biết đọc trước câu hỏi, gạch từ khóa và tìm đúng bằng chứng trong input.",
    slots: [
      { skill: "listening", order: 2 },
      { skill: "reading", order: 2 },
    ],
  },
  {
    title: "Mở rộng câu có kiểm soát",
    focus: "Subject–verb agreement, thì cơ bản và câu trả lời có lý do",
    outcome:
      "Tạo được câu dài hơn nhưng vẫn kiểm soát được lỗi ngữ pháp thường gặp.",
    slots: [
      { skill: "writing", order: 2 },
      { skill: "speaking", order: 2 },
    ],
  },
  {
    title: "Nghe ý chính, đọc ý chính",
    focus: "Multiple choice, matching headings và nhận diện main idea",
    outcome:
      "Không bị mắc kẹt ở từng từ; biết bỏ qua chi tiết chưa cần thiết để giữ mạch.",
    slots: [
      { skill: "listening", order: 3 },
      { skill: "reading", order: 3 },
    ],
  },
  {
    title: "Nối ý thành đoạn",
    focus: "Topic sentence, cohesion và kể một trải nghiệm ngắn",
    outcome:
      "Viết được đoạn 5 câu có mở ý, phát triển và kết ý; nói được câu chuyện 45 giây.",
    slots: [
      { skill: "writing", order: 3 },
      { skill: "speaking", order: 3 },
    ],
  },
  {
    title: "Nhận diện bẫy",
    focus:
      "Distractor, matching information và phân biệt đúng/sai/không có thông tin",
    outcome: "Giải thích được vì sao một lựa chọn sai thay vì chỉ nhớ đáp án.",
    slots: [
      { skill: "listening", order: 4 },
      { skill: "reading", order: 4 },
    ],
  },
  {
    title: "Từ vựng dùng được",
    focus: "Collocation theo chủ đề, paraphrase và mô tả số liệu đơn giản",
    outcome:
      "Dùng được từ vựng quen thuộc trong câu thật, tránh học thuộc danh sách rời rạc.",
    slots: [
      { skill: "writing", order: 4 },
      { skill: "speaking", order: 4 },
    ],
  },
  {
    title: "Tăng độ chính xác",
    focus:
      "Short answer, sentence completion và đọc scanning có giới hạn thời gian",
    outcome:
      "Tăng accuracy trước khi tăng tốc; biết ghi error log sau mỗi set.",
    slots: [
      { skill: "listening", order: 5 },
      { skill: "reading", order: 5 },
    ],
  },
  {
    title: "Nói và viết có mục đích",
    focus: "Nêu quan điểm, discussion cơ bản và trả lời Part 3 ở mức đơn giản",
    outcome:
      "Trả lời đúng trọng tâm, có lý do và ví dụ thay vì lặp lại đề bài.",
    slots: [
      { skill: "writing", order: 5 },
      { skill: "speaking", order: 5 },
    ],
  },
  {
    title: "Ghép kỹ năng thành bài",
    focus: "Mixed question types, đọc nhanh hơn và trình bày ý rõ ràng",
    outcome:
      "Hoàn thành một mini set liên kỹ năng với thời gian và checklist tự chấm.",
    slots: [
      { skill: "listening", order: 6 },
      { skill: "reading", order: 6 },
    ],
  },
  {
    title: "Checkpoint Starter",
    focus: "Portfolio 4 kỹ năng, sửa lỗi lặp lại và chuẩn bị retest",
    outcome: "Có bộ bài mẫu, error log và kế hoạch chuyển tiếp lên Elementary.",
    slots: [
      { skill: "writing", order: 6 },
      { skill: "speaking", order: 6 },
    ],
  },
];

export function getStarterWeeks(): StarterWeek[] {
  return STARTER_WEEK_SLOTS.map((week, index) => ({
    week: index + 1,
    title: week.title,
    focus: week.focus,
    outcome: week.outcome,
    lessons: week.slots.flatMap(({ skill, order }) => {
      const lesson = getRoadmapLesson(
        "starter-0-2.5",
        skill,
        skill + "-starter-0-2.5-" + order,
      );
      return lesson ? [{ skill, lesson }] : [];
    }),
  }));
}
