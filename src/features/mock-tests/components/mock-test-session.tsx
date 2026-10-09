import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Headphones,
  LockKeyhole,
  Mic,
  PenLine,
  Sparkles,
  Trophy,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/shared/confirm-submit-button";
import {
  startMockSectionAction,
  submitMockTestAction,
} from "@/features/mock-tests/actions";
import {
  formatMockDuration,
  formatMockSectionType,
  formatMockSessionStatus,
} from "@/features/mock-tests/model";
import type { MockSessionPageData } from "@/features/mock-tests/server/content";

const sectionIcons: Record<string, React.ElementType> = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenLine,
  speaking: Mic,
};

const sectionColorMap: Record<
  string,
  { card: string; icon: string; badge: string }
> = {
  listening: {
    card: "border-blue-100 hover:border-blue-200",
    icon: "bg-blue-50 text-blue-600",
    badge: "bg-blue-50 text-blue-700 border-blue-100",
  },
  reading: {
    card: "border-emerald-100 hover:border-emerald-200",
    icon: "bg-emerald-50 text-emerald-600",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  writing: {
    card: "border-amber-100 hover:border-amber-200",
    icon: "bg-amber-50 text-amber-600",
    badge: "bg-amber-50 text-amber-700 border-amber-100",
  },
  speaking: {
    card: "border-rose-100 hover:border-rose-200",
    icon: "bg-rose-50 text-rose-600",
    badge: "bg-rose-50 text-rose-700 border-rose-100",
  },
};

const errors: Record<string, string> = {
  "section-start":
    "Chưa thể mở section. Hãy hoàn thành section trước đó rồi thử lại.",
  "section-route": "Section đã mở nhưng chưa xác định được đường dẫn nội dung.",
  incomplete: "Chỉ có thể nộp mock test sau khi đủ bốn section.",
  summary: "Bài đã nộp nhưng chưa thể tạo trang tổng kết. Hãy thử lại.",
};

export function MockTestSession({
  data,
  error,
}: {
  data: MockSessionPageData;
  error?: string;
}) {
  const firstPendingIndex = data.sections.findIndex(
    (section) => section.attempt?.status !== "submitted",
  );
  const allSubmitted = firstPendingIndex === -1;
  const completedCount = data.sections.filter(
    (s) => s.attempt?.status === "submitted",
  ).length;
  const progressPercent = Math.round(
    (completedCount / data.sections.length) * 100,
  );

  return (
    <div className="space-y-8 font-sans pb-12">
      {/* Header */}
      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 sm:p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-50 rounded-full -translate-y-1/2 translate-x-1/3 opacity-50 pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <span className="rounded-full bg-indigo-100 text-indigo-700 px-3 py-1 text-[11px] font-black uppercase tracking-wider">
                {formatMockSessionStatus(data.session.status)}
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Session
              </div>
            </div>
            <h1 className="text-2xl font-black text-slate-800 sm:text-3xl mb-2">
              {data.version.title}
            </h1>
            <p className="text-sm font-medium text-slate-500 max-w-lg">
              Complete each section in order. Time limits are strictly enforced.
            </p>
          </div>

          {/* Progress Widget */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shrink-0 min-w-[180px] text-center">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">
              Overall Progress
            </p>
            <div className="text-4xl font-black text-indigo-600 mb-1">
              {completedCount}
              <span className="text-xl font-bold text-slate-400">
                /{data.sections.length}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500 mb-3">
              Sections done
            </p>
            <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Error */}
      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 border border-rose-100 px-5 py-4 font-semibold text-rose-700 text-sm"
        >
          ⚠️ {errors[error] ?? "Yêu cầu chưa thể xử lý. Vui lòng thử lại."}
        </p>
      ) : null}

      {/* Sections List */}
      <section>
        <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">
          Section Checklist
        </h2>
        <ol className="space-y-4">
          {data.sections.map((section, index) => {
            const status = section.attempt?.status;
            const isCurrent = index === firstPendingIndex;
            const isLocked = !allSubmitted && index > firstPendingIndex;
            const isDone = status === "submitted";
            const isInProgress = status === "in_progress";
            const sectionKey = section.type.toLowerCase();
            const Icon = sectionIcons[sectionKey] ?? FileCheck2;
            const colors = sectionColorMap[sectionKey] ?? {
              card: "border-slate-100",
              icon: "bg-slate-50 text-slate-500",
              badge: "bg-slate-50 text-slate-600 border-slate-100",
            };

            return (
              <li
                key={section.id}
                className={`flex items-center gap-5 bg-white rounded-2xl border p-6 shadow-sm transition-all ${
                  isDone
                    ? "border-emerald-100 bg-emerald-50/20"
                    : isLocked
                      ? "border-slate-100 opacity-60"
                      : isCurrent
                        ? `${colors.card} ring-2 ring-indigo-500/20`
                        : colors.card
                }`}
              >
                {/* Step number / status dot */}
                <div
                  className={`size-10 rounded-full flex items-center justify-center shrink-0 font-black text-sm transition-all ${
                    isDone
                      ? "bg-emerald-500 text-white"
                      : isCurrent
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {isDone ? (
                    <Check size={18} />
                  ) : isLocked ? (
                    <LockKeyhole size={16} />
                  ) : (
                    section.order
                  )}
                </div>

                {/* Section icon */}
                <div
                  className={`size-12 rounded-2xl flex items-center justify-center shrink-0 ${colors.icon}`}
                >
                  <Icon size={22} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider border rounded-md px-2 py-0.5 ${colors.badge}`}
                    >
                      {formatMockSectionType(section.type)}
                    </span>
                    {isInProgress && (
                      <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 border border-amber-100 rounded-md px-2 py-0.5 flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                        In Progress
                      </span>
                    )}
                    {isDone && (
                      <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-md px-2 py-0.5 flex items-center gap-1">
                        <CheckCircle2 size={11} /> Submitted
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 truncate">
                    {section.title}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mt-1">
                    <Clock3 size={12} />
                    {formatMockDuration(section.timeLimitSeconds)}
                    {isLocked && " · Locked"}
                  </p>
                </div>

                {/* Action */}
                <div className="shrink-0">
                  {isDone ? (
                    <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-4 py-2">
                      <Check size={15} /> Done
                    </span>
                  ) : isLocked ? (
                    <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400 bg-slate-50 border border-slate-100 rounded-full px-4 py-2">
                      <LockKeyhole size={15} /> Locked
                    </span>
                  ) : section.practicePath ? (
                    <Button
                      asChild
                      className="rounded-xl h-11 px-5 font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                    >
                      <Link href={section.practicePath}>
                        Continue <ArrowRight size={16} className="ml-1" />
                      </Link>
                    </Button>
                  ) : isCurrent ? (
                    <form action={startMockSectionAction}>
                      <input
                        type="hidden"
                        name="mockTestSlug"
                        value={data.test.slug}
                      />
                      <input
                        type="hidden"
                        name="sessionId"
                        value={data.session.id}
                      />
                      <input
                        type="hidden"
                        name="sectionId"
                        value={section.id}
                      />
                      <Button
                        type="submit"
                        className="rounded-xl h-11 px-5 font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                      >
                        Start Section <ArrowRight size={16} className="ml-1" />
                      </Button>
                    </form>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Finish / Summary CTA */}
      {data.session.status === "completed" ? (
        <div className="bg-emerald-600 rounded-3xl p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-lg shadow-emerald-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/4 pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-xl font-black text-white mb-1 flex items-center gap-2">
              <Trophy size={20} /> Exam Completed!
            </h2>
            <p className="text-sm font-medium text-emerald-100">
              Your AI-powered band score report is ready.
            </p>
          </div>
          <Button
            asChild
            className="rounded-2xl h-14 px-8 text-base font-black bg-white text-emerald-700 hover:bg-emerald-50 shadow-md shrink-0 relative z-10"
          >
            <Link
              href={`/mock-tests/${data.test.slug}/session/${data.session.id}/summary`}
            >
              View Full Report <ArrowRight size={18} className="ml-2" />
            </Link>
          </Button>
        </div>
      ) : allSubmitted ? (
        <div className="bg-indigo-600 rounded-3xl p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-lg shadow-indigo-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/4 pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-xl font-black text-white mb-2 flex items-center gap-2">
              <Sparkles size={20} /> All Sections Submitted!
            </h2>
            <p className="text-sm font-medium text-indigo-200 max-w-sm">
              Lock in your results and generate your AI-powered band score
              report and detailed feedback.
            </p>
          </div>
          <form action={submitMockTestAction} className="relative z-10 shrink-0">
            <input
              type="hidden"
              name="mockTestSlug"
              value={data.test.slug}
            />
            <input type="hidden" name="sessionId" value={data.session.id} />
            <ConfirmSubmitButton
              className="h-14 px-8 text-base font-black rounded-2xl bg-white text-indigo-700 hover:bg-indigo-50 shadow-md"
              label="Finish & Get Report"
              title="Finalize Mock Test?"
              description="Your session will be locked and your AI band score report will be generated from all four sections."
              confirmLabel="Confirm Finish"
            />
          </form>
        </div>
      ) : null}
    </div>
  );
}
