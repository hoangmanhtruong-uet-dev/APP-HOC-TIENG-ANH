import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Lightbulb,
  ListChecks,
  RotateCcw,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ExerciseCard,
  PrimaryLink,
  RoadmapBreadcrumb,
} from "@/components/roadmap/roadmap-shared";
import {
  getRoadmapLesson,
  getRoadmapLevel,
  getRoadmapPractice,
  getSkillStage,
  isRoadmapLevel,
  isRoadmapSkill,
  ROADMAP_SKILL_LABELS,
  type IELTSLevelId,
  type IELTSSkill,
  type RoadmapPractice,
} from "@/content/ielts-roadmap";
import { requireCompletedOnboarding } from "@/server/onboarding/learner-profile";

export const metadata: Metadata = { title: "Bài học theo lộ trình" };

export default async function RoadmapItemPage({
  params,
}: {
  params: Promise<{ levelId: string; skill: string; itemId: string }>;
}) {
  await requireCompletedOnboarding();
  const { levelId: rawLevelId, skill: rawSkill, itemId } = await params;
  if (!isRoadmapLevel(rawLevelId) || !isRoadmapSkill(rawSkill)) notFound();

  const level = getRoadmapLevel(rawLevelId);
  if (!level) notFound();

  if (itemId === "practice") {
    const practice = getRoadmapPractice(rawLevelId, rawSkill);
    if (!practice) notFound();
    return (
      <PracticePage
        levelId={rawLevelId}
        levelTitle={level.title}
        skill={rawSkill}
        practice={practice}
      />
    );
  }

  const lesson = getRoadmapLesson(rawLevelId, rawSkill, itemId);
  const stage = getSkillStage(rawLevelId, rawSkill);
  if (!lesson || !stage) notFound();
  const nextLesson =
    stage.lessons.find((candidate) => candidate.order === lesson.order + 1) ??
    null;

  return (
    <div className="space-y-9">
      <RoadmapBreadcrumb
        levelId={rawLevelId}
        levelTitle={level.title}
        skill={rawSkill}
        current={lesson.title}
      />

      <header className="max-w-4xl border-b border-[var(--border)] pb-8">
        <p className="text-sm font-bold tracking-[0.1em] text-[var(--primary)] uppercase">
          Bài {lesson.order}/6 · {ROADMAP_SKILL_LABELS[rawSkill]} · Band{" "}
          {lesson.targetBand}
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] text-pretty">
          {lesson.title}
        </h1>
        <p className="mt-4 text-lg leading-8 text-[var(--muted-foreground)]">
          {lesson.estimatedMinutes} phút · Học khái niệm, xem cách làm mẫu, thực
          hành có hướng dẫn rồi tự hoàn thành bài tương tự.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {lesson.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[var(--muted)] px-3 py-1.5 text-xs font-bold"
            >
              {tag}
            </span>
          ))}
        </div>
      </header>

      <div className="grid gap-9 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <main className="min-w-0 space-y-10">
          <LessonSection
            eyebrow="01 · Mục tiêu"
            title="Sau bài này, bạn có thể"
            items={lesson.learningObjectives}
            icon="check"
          />
          <LessonSection
            eyebrow="02 · Lý thuyết"
            title="Điểm kiến thức trọng tâm"
            items={lesson.teachingPoints}
            icon="idea"
          />

          <section aria-labelledby="guided-title">
            <p className="text-sm font-bold text-[var(--primary)]">
              03 · Thực hành có hướng dẫn
            </p>
            <h2 id="guided-title" className="mt-1 text-2xl font-bold">
              Làm chậm để hiểu cách tư duy
            </h2>
            <div className="mt-5 grid gap-4">
              {lesson.guidedPractice.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  title={exercise.title}
                  instruction={exercise.instruction}
                  expectedOutput={exercise.expectedOutput}
                  minutes={exercise.estimatedMinutes}
                  answerKey={exercise.answerKey}
                  selfCheck={exercise.selfCheck}
                />
              ))}
            </div>
          </section>

          <section aria-labelledby="independent-title">
            <p className="text-sm font-bold text-[var(--primary)]">
              04 · Tự thực hành
            </p>
            <h2 id="independent-title" className="mt-1 text-2xl font-bold">
              Kiểm tra khả năng tự vận dụng
            </h2>
            <div className="mt-5 grid gap-4">
              {lesson.independentPractice.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  title={exercise.title}
                  instruction={exercise.instruction}
                  expectedOutput={exercise.expectedOutput}
                  minutes={exercise.estimatedMinutes}
                  answerKey={exercise.answerKey}
                  selfCheck={exercise.selfCheck}
                />
              ))}
            </div>
          </section>

          <section aria-labelledby="homework-title">
            <p className="text-sm font-bold text-[var(--primary)]">
              05 · Củng cố
            </p>
            <h2 id="homework-title" className="mt-1 text-2xl font-bold">
              Bài tập sau buổi học
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {lesson.homework.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  title={exercise.title}
                  instruction={exercise.instruction}
                  expectedOutput={exercise.expectedOutput}
                  minutes={exercise.estimatedMinutes}
                  answerKey={exercise.answerKey}
                  selfCheck={exercise.selfCheck}
                />
              ))}
            </div>
          </section>
        </main>

        <aside className="space-y-5 lg:sticky lg:top-24">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="flex items-center gap-2 font-bold">
              <ListChecks
                aria-hidden="true"
                size={19}
                className="text-[var(--primary)]"
              />
              Đạt bài khi
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted-foreground)]">
              {lesson.masteryChecks.map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2
                    aria-hidden="true"
                    size={16}
                    className="mt-1 shrink-0 text-[var(--success)]"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-[var(--warning-soft)] bg-[var(--warning-subtle)] p-5">
            <h2 className="flex items-center gap-2 font-bold">
              <AlertTriangle aria-hidden="true" size={19} />
              Lỗi cần tránh
            </h2>
            <ul className="mt-4 space-y-2 pl-5 text-sm leading-6">
              {lesson.commonErrors.map((item) => (
                <li key={item} className="list-disc">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <details className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-bold">
              <RotateCcw
                aria-hidden="true"
                size={18}
                className="text-[var(--primary)]"
              />
              Khi chưa đạt
            </summary>
            <ul className="mt-3 space-y-2 pl-5 text-sm leading-6 text-[var(--muted-foreground)]">
              {lesson.remediation.map((item) => (
                <li key={item} className="list-disc">
                  {item}
                </li>
              ))}
            </ul>
          </details>
        </aside>
      </div>

      <footer className="flex flex-col gap-4 border-t border-[var(--border)] pt-7 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm leading-6 text-[var(--muted-foreground)]">
          Hoàn thành bài tự luyện và ghi lỗi trước khi chuyển tiếp. Đây là phần
          giúp kiến thức trở thành kỹ năng.
        </p>
        <PrimaryLink
          href={
            nextLesson
              ? `/roadmap/${rawLevelId}/${rawSkill}/${nextLesson.id}`
              : `/roadmap/${rawLevelId}/${rawSkill}/practice`
          }
        >
          {nextLesson ? "Bài tiếp theo" : "Làm bài thực hành"}
        </PrimaryLink>
      </footer>
    </div>
  );
}

function LessonSection({
  eyebrow,
  title,
  items,
  icon,
}: {
  eyebrow: string;
  title: string;
  items: string[];
  icon: "check" | "idea";
}) {
  const Icon = icon === "idea" ? Lightbulb : ClipboardCheck;
  return (
    <section>
      <p className="text-sm font-bold text-[var(--primary)]">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-bold">{title}</h2>
      <ul className="mt-5 divide-y divide-[var(--border)] border-y border-[var(--border)]">
        {items.map((item) => (
          <li key={item} className="flex gap-3 py-4 leading-7">
            <Icon
              aria-hidden="true"
              size={19}
              className="mt-1 shrink-0 text-[var(--primary)]"
            />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function PracticePage({
  levelId,
  levelTitle,
  skill,
  practice,
}: {
  levelId: IELTSLevelId;
  levelTitle: string;
  skill: IELTSSkill;
  practice: RoadmapPractice;
}) {
  return (
    <div className="space-y-9">
      <RoadmapBreadcrumb
        levelId={levelId}
        levelTitle={levelTitle}
        skill={skill}
        current="Bài thực hành"
      />
      <header className="max-w-4xl border-b border-[var(--border)] pb-8">
        <p className="text-sm font-bold tracking-[0.1em] text-[var(--primary)] uppercase">
          Thực hành · {ROADMAP_SKILL_LABELS[skill]}
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] text-pretty">
          {practice.title}
        </h1>
        <p className="mt-4 text-lg leading-8 text-[var(--muted-foreground)]">
          Làm lần đầu trong điều kiện kiểm tra, sau đó mới mở phần review và đối
          chiếu lỗi. Giữ lại bản đầu tiên để theo dõi tiến bộ thật.
        </p>
      </header>
      <PracticeContent skill={skill} practice={practice} />
      <div className="flex flex-wrap gap-3 border-t border-[var(--border)] pt-7">
        <Link
          href={`/roadmap/${levelId}`}
          className="inline-flex min-h-11 items-center rounded-lg border border-[var(--border-strong)] px-4 text-sm font-semibold hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
        >
          Quay lại chặng học
        </Link>
        <Link
          href={`/practice/${skill}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Mở phòng luyện {ROADMAP_SKILL_LABELS[skill]}
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </div>
    </div>
  );
}

function PracticeContent({
  skill,
  practice,
}: {
  skill: IELTSSkill;
  practice: RoadmapPractice;
}) {
  if (skill === "reading" && "passage" in practice) {
    return (
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
          <p className="text-sm font-bold text-[var(--primary)]">Passage</p>
          <p className="mt-4 text-lg leading-9">{practice.passage}</p>
        </article>
        <QuestionList questions={practice.questions} />
      </div>
    );
  }

  if (skill === "listening" && "transcript" in practice) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-[var(--warning-soft)] bg-[var(--warning-subtle)] p-5">
          <p className="font-bold">Quy tắc làm bài</p>
          <p className="mt-2 leading-7">{practice.usage}</p>
        </div>
        <QuestionList questions={practice.questions} />
        <details className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <summary className="min-h-11 cursor-pointer py-2 text-lg font-bold">
            Mở transcript sau lần nghe đầu
          </summary>
          <p className="mt-4 leading-8 text-[var(--muted-foreground)]">
            {practice.transcript}
          </p>
        </details>
        <Checklist title="Quy trình review" items={practice.review} />
      </div>
    );
  }

  if (skill === "writing" && "prompt" in practice) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
          <p className="text-sm font-bold text-[var(--primary)]">Đề bài</p>
          <p className="mt-4 text-xl leading-9 font-semibold">
            {practice.prompt}
          </p>
        </article>
        <div className="space-y-6">
          <Checklist title="Quy trình làm bài" items={practice.workflow} />
          <Checklist title="Checklist tự chấm" items={practice.selfCheck} />
        </div>
      </div>
    );
  }

  if (skill === "speaking" && "recordingRules" in practice) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
          <p className="text-sm font-bold text-[var(--primary)]">
            Câu hỏi luyện nói
          </p>
          <ol className="mt-5 space-y-5">
            {practice.questions.map((question, index) => (
              <li key={question} className="flex gap-3 text-lg leading-8">
                <span className="font-bold text-[var(--primary)]">
                  {index + 1}.
                </span>
                {question}
              </li>
            ))}
          </ol>
        </article>
        <div className="space-y-6">
          <Checklist title="Quy tắc ghi âm" items={practice.recordingRules} />
          <Checklist title="Tự review" items={practice.selfReview} />
        </div>
      </div>
    );
  }

  return null;
}

function QuestionList({
  questions,
}: {
  questions: Array<{ id: string; question: string; answer: string }>;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
      <h2 className="text-xl font-bold">Câu hỏi</h2>
      <ol className="mt-5 space-y-5">
        {questions.map((question, index) => (
          <li key={question.id}>
            <p className="leading-7 font-semibold">
              {index + 1}. {question.question}
            </p>
            <details className="mt-2">
              <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-[var(--primary)]">
                Xem đáp án
              </summary>
              <p className="rounded-lg bg-[var(--muted)] p-3 text-sm">
                {question.answer}
              </p>
            </details>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Checklist({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="font-bold">{title}</h2>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-2 text-sm leading-6 text-[var(--muted-foreground)]"
          >
            <CheckCircle2
              aria-hidden="true"
              size={17}
              className="mt-1 shrink-0 text-[var(--primary)]"
            />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
