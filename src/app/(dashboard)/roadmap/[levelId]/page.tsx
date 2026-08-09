import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Layers3,
  Target,
  Timer,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { RoadmapBreadcrumb } from "@/components/roadmap/roadmap-shared";
import {
  getRoadmapLevel,
  getSkillStage,
  isRoadmapLevel,
  ROADMAP_SKILL_DESCRIPTIONS,
  ROADMAP_SKILL_LABELS,
  ROADMAP_SKILLS,
} from "@/content/ielts-roadmap";
import { getStarterWeeks } from "@/content/starter-roadmap";
import { requireCompletedOnboarding } from "@/server/onboarding/learner-profile";

export const metadata: Metadata = {
  title: "Chi tiết lộ trình IELTS",
  description: "Lộ trình học IELTS theo tuần, bài học và mục tiêu đầu ra.",
};

export default async function RoadmapLevelPage({
  params,
}: {
  params: Promise<{ levelId: string }>;
}) {
  await requireCompletedOnboarding();
  const { levelId: rawLevelId } = await params;
  if (!isRoadmapLevel(rawLevelId)) notFound();

  const level = getRoadmapLevel(rawLevelId);
  if (!level) notFound();

  if (rawLevelId === "starter-0-2.5") {
    return <StarterRoadmap level={level} />;
  }

  return <GenericLevelRoadmap level={level} levelId={rawLevelId} />;
}

function StarterRoadmap({
  level,
}: {
  level: NonNullable<ReturnType<typeof getRoadmapLevel>>;
}) {
  const weeks = getStarterWeeks();
  const lessonCount = weeks.reduce(
    (count, week) => count + week.lessons.length,
    0,
  );

  return (
    <div className="space-y-10">
      <RoadmapBreadcrumb current={level.title} />

      <header className="overflow-hidden rounded-[1.75rem] bg-[var(--foreground)] text-white">
        <div className="grid gap-10 p-7 sm:p-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:p-12">
          <div>
            <p className="text-sm font-bold tracking-[0.14em] text-[#b7c6ff] uppercase">
              Starter · mất gốc · 12 tuần
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-[-0.055em] text-pretty sm:text-6xl">
              Xây lại nền tiếng Anh, từng tuần một.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#dbe2f0] sm:text-lg">
              Không nhảy thẳng vào đề IELTS. Bạn sẽ đi từ âm, câu, từ khóa và
              phản xạ cơ bản đến một portfolio đủ 4 kỹ năng để chuyển sang
              Elementary.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={firstLessonHref(weeks)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-[var(--foreground)] transition-transform hover:bg-[#eef2ff] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none active:translate-y-px"
              >
                Bắt đầu tuần 1
                <ArrowRight aria-hidden="true" size={18} />
              </Link>
              <a
                href="#weekly-plan"
                className="inline-flex min-h-11 items-center rounded-xl border border-white/30 px-4 text-sm font-bold text-white hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                Xem toàn bộ kế hoạch
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px self-end overflow-hidden rounded-2xl border border-white/15 bg-white/15">
            <HeroStat value="0 → 2.5" label="band mục tiêu" />
            <HeroStat value="8h" label="mỗi tuần" />
            <HeroStat value="24" label="bài cốt lõi" />
            <HeroStat value="4" label="kỹ năng" />
          </div>
        </div>
        <div className="grid gap-4 border-t border-white/10 px-7 py-5 text-sm text-[#dbe2f0] sm:grid-cols-3 sm:px-10 lg:px-12">
          <p className="flex gap-2">
            <CheckCircle2
              className="mt-0.5 shrink-0 text-[#9fb2ff]"
              size={17}
            />
            Học chậm để tạo nền chắc
          </p>
          <p className="flex gap-2">
            <CheckCircle2
              className="mt-0.5 shrink-0 text-[#9fb2ff]"
              size={17}
            />
            Mỗi bài có bài tập và output
          </p>
          <p className="flex gap-2">
            <CheckCircle2
              className="mt-0.5 shrink-0 text-[#9fb2ff]"
              size={17}
            />
            Có error log và checkpoint
          </p>
        </div>
      </header>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div>
          <p className="text-sm font-bold tracking-[0.1em] text-[var(--primary)] uppercase">
            Cách học
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em]">
            Mỗi tuần có một đích đến rõ ràng
          </h2>
          <p className="mt-3 max-w-2xl leading-7 text-[var(--muted-foreground)]">
            Mỗi bài học mở ra một trang riêng gồm mục tiêu, điểm kiến thức,
            guided practice, bài tự làm, homework, lỗi thường gặp và cách học
            lại. Bạn không cần đoán hôm nay phải học gì.
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">
            Chu kỳ một bài
          </p>
          <ol className="mt-3 space-y-3 text-sm font-semibold">
            <Step number="01" label="Hiểu khái niệm" />
            <Step number="02" label="Làm có hướng dẫn" />
            <Step number="03" label="Tự làm và ghi lỗi" />
          </ol>
        </div>
      </section>

      <section id="weekly-plan" aria-labelledby="weekly-plan-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold tracking-[0.1em] text-[var(--primary)] uppercase">
              Kế hoạch 12 tuần
            </p>
            <h2
              id="weekly-plan-title"
              className="mt-2 text-3xl font-bold tracking-[-0.04em]"
            >
              Từ câu đầu tiên đến checkpoint
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-[var(--muted-foreground)]">
            Mỗi tuần học 2 bài cốt lõi, cộng thời gian ôn từ vựng, sửa error log
            và luyện lại bài chưa đạt.
          </p>
        </div>

        <ol className="mt-7 space-y-4">
          {weeks.map((week) => (
            <li
              key={week.week}
              className="grid gap-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--border-strong)] sm:p-6 lg:grid-cols-[5rem_minmax(0,0.8fr)_minmax(0,1.2fr)]"
            >
              <div>
                <p className="text-xs font-bold tracking-[0.12em] text-[var(--primary)] uppercase">
                  Tuần
                </p>
                <p className="mt-1 text-4xl font-bold tracking-[-0.06em] tabular-nums">
                  {String(week.week).padStart(2, "0")}
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold">{week.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                  {week.focus}
                </p>
                <p className="mt-4 flex gap-2 text-sm leading-6 font-semibold">
                  <Target
                    className="mt-1 shrink-0 text-[var(--primary)]"
                    size={16}
                  />
                  {week.outcome}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {week.lessons.map(({ lesson, skill }) => (
                  <Link
                    key={lesson.id}
                    href={lessonHref(lesson.levelId, skill, lesson.id)}
                    className="group rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 transition-transform hover:-translate-y-0.5 hover:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                  >
                    <span className="flex items-center justify-between gap-3 text-xs font-bold tracking-[0.08em] text-[var(--primary)] uppercase">
                      {ROADMAP_SKILL_LABELS[skill]} · Bài {lesson.order}
                      <ChevronRight
                        aria-hidden="true"
                        size={16}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </span>
                    <span className="mt-3 block leading-6 font-bold">
                      {lesson.title}
                    </span>
                    <span className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[var(--muted-foreground)]">
                      <Clock3 aria-hidden="true" size={14} />
                      {lesson.estimatedMinutes} phút học
                    </span>
                    <span className="mt-3 block text-sm leading-6 text-[var(--muted-foreground)]">
                      {lesson.learningObjectives[0]}
                    </span>
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 border-t border-[var(--border)] pt-8 sm:grid-cols-3">
        <OutcomeCard
          icon={<BookOpenCheck aria-hidden="true" size={20} />}
          title="24 bài học thật"
          body={
            lessonCount +
            " bài đều có trang nội dung chi tiết, không phải placeholder."
          }
        />
        <OutcomeCard
          icon={<Timer aria-hidden="true" size={20} />}
          title="Học theo output"
          body="Mỗi bài yêu cầu một sản phẩm cụ thể: câu trả lời, đoạn viết, audio hoặc error log."
        />
        <OutcomeCard
          icon={<Layers3 aria-hidden="true" size={20} />}
          title="Checkpoint cuối chặng"
          body="Làm full-skill test, review lỗi, retest sau 24 giờ trước khi lên Elementary."
        />
      </section>
    </div>
  );
}

function GenericLevelRoadmap({
  level,
  levelId,
}: {
  level: NonNullable<ReturnType<typeof getRoadmapLevel>>;
  levelId: Parameters<typeof getRoadmapLevel>[0];
}) {
  const stages = ROADMAP_SKILLS.flatMap((skill) => {
    const stage = getSkillStage(levelId, skill);
    return stage ? [{ skill, stage }] : [];
  });

  return (
    <div className="space-y-9">
      <RoadmapBreadcrumb current={level.title} />
      <header className="grid gap-6 border-b border-[var(--border)] pb-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="text-sm font-bold tracking-[0.1em] text-[var(--primary)] uppercase">
            Band {level.band.from}–{level.band.to}
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] text-pretty">
            {level.title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
            Hoàn thành lần lượt lý thuyết, guided practice và bài tự luyện. Sau
            mỗi 2 tuần, dùng bài thực hành để kiểm tra khả năng vận dụng.
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <Stat label="Thời lượng" value={level.recommendedWeeks + " tuần"} />
          <Stat label="Cường độ" value={level.weeklyHours + " giờ/tuần"} />
          <Stat label="Lý thuyết" value="24 bài" />
          <Stat label="Thực hành" value="4 bộ" />
        </dl>
      </header>
      <div className="space-y-7">
        {stages.map(({ skill, stage }) => (
          <section
            key={skill}
            aria-labelledby={skill + "-title"}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7"
          >
            <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
              <div>
                <p className="text-sm font-semibold text-[var(--primary)]">
                  Kỹ năng
                </p>
                <h2 id={skill + "-title"} className="mt-1 text-2xl font-bold">
                  {ROADMAP_SKILL_LABELS[skill]}
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
                  {ROADMAP_SKILL_DESCRIPTIONS[skill]}
                </p>
                <div className="mt-5 flex flex-wrap gap-4 text-sm font-medium text-[var(--muted-foreground)]">
                  <span className="inline-flex items-center gap-2">
                    <BookOpenCheck aria-hidden="true" size={17} />6 bài
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Clock3 aria-hidden="true" size={17} />
                    {stage.studyTime.lessonMinutes} phút/bài
                  </span>
                </div>
              </div>
              <ol className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
                {stage.lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <Link
                      href={lessonHref(levelId, skill, lesson.id)}
                      className="group flex min-h-16 items-center gap-3 py-3 focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                    >
                      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-sm font-bold tabular-nums">
                        {lesson.order}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-pretty group-hover:text-[var(--primary)]">
                          {lesson.title}
                        </span>
                        <span className="mt-1 block text-xs font-medium text-[var(--muted-foreground)]">
                          {lesson.learningObjectives[0]}
                        </span>
                      </span>
                      <ArrowRight
                        aria-hidden="true"
                        size={18}
                        className="shrink-0 text-[var(--primary)]"
                      />
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function lessonHref(levelId: string, skill: string, lessonId: string) {
  return "/roadmap/" + levelId + "/" + skill + "/" + lessonId;
}

function firstLessonHref(weeks: ReturnType<typeof getStarterWeeks>) {
  const first = weeks[0]?.lessons[0];
  return first
    ? lessonHref(first.lesson.levelId, first.skill, first.lesson.id)
    : "/roadmap/starter-0-2.5";
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-white/10 p-4">
      <p className="text-2xl font-bold tracking-[-0.04em]">{value}</p>
      <p className="mt-1 text-xs text-[#c7d2e6]">{label}</p>
    </div>
  );
}

function Step({ number, label }: { number: string; label: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="text-xs font-bold text-[var(--primary)] tabular-nums">
        {number}
      </span>
      <span>{label}</span>
    </li>
  );
}

function OutcomeCard({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="border-t-2 border-[var(--border-strong)] pt-4">
      <span className="text-[var(--primary)]">{icon}</span>
      <h3 className="mt-3 font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
        {body}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[var(--muted-foreground)]">{label}</dt>
      <dd className="mt-1 font-bold">{value}</dd>
    </div>
  );
}
