"use client";

import {
  Award,
  BookOpen,
  Briefcase,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Flame,
  Globe,
  GraduationCap,
  Headphones,
  Mic,
  PenTool,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  completeOnboardingAction,
  type OnboardingActionState,
  saveOnboardingStepAction,
} from "@/features/onboarding/actions";
import {
  BAND_SCORES,
  DAILY_STUDY_MINUTES,
  GOAL_LABELS,
  isPrimaryGoal,
  isPrioritySkill,
  isTestType,
  ONBOARDING_STEPS,
  PRIMARY_GOALS,
  PRIORITY_SKILLS,
  SKILL_LABELS,
  TEST_TYPE_LABELS,
} from "@/features/onboarding/constants";
import type { LearnerProfile } from "@/features/onboarding/server/learner-profile";
import { cn } from "@/lib/utils";

const initialActionState: OnboardingActionState = { status: "idle" };
const FORM_STEP_COUNT = ONBOARDING_STEPS.length - 1;
const ALL_PRIORITY_SKILLS = [...PRIORITY_SKILLS];

type WizardValues = {
  testType: string;
  currentBand: string;
  targetBand: string;
  primaryGoal: string;
  targetExamDate: string;
  dailyStudyMinutes: string;
  studyDaysPerWeek: string;
  prioritySkills: string[];
};

function initialValues(profile: LearnerProfile | null): WizardValues {
  return {
    testType: profile?.test_type ?? "",
    currentBand:
      profile?.current_band === null || profile?.current_band === undefined
        ? "unknown"
        : String(profile.current_band),
    targetBand:
      profile?.target_band === null || profile?.target_band === undefined
        ? ""
        : String(profile.target_band),
    primaryGoal: profile?.primary_goal ?? "",
    targetExamDate: profile?.target_exam_date ?? "",
    dailyStudyMinutes:
      profile?.daily_study_minutes === null ||
      profile?.daily_study_minutes === undefined
        ? ""
        : String(profile.daily_study_minutes),
    studyDaysPerWeek:
      profile?.study_days_per_week === null ||
      profile?.study_days_per_week === undefined
        ? ""
        : String(profile.study_days_per_week),
    prioritySkills: profile?.priority_skills.filter(isPrioritySkill) ?? [],
  };
}

function formatExamDate(value: string) {
  if (!value) return "Chưa xác định";
  const date = new Date(value + "T00:00:00Z");
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatWeeklyStudyTime(minutesValue: string, daysValue: string) {
  const weeklyMinutes = Number(minutesValue) * Number(daysValue);
  if (!Number.isFinite(weeklyMinutes) || weeklyMinutes <= 0) return null;
  const hours = Math.floor(weeklyMinutes / 60);
  const minutes = weeklyMinutes % 60;
  const parts = [hours ? hours + " giờ" : "", minutes ? minutes + " phút" : ""];
  return parts.filter(Boolean).join(" ") + " mỗi tuần";
}

function getBandDescription(bandStr: string) {
  if (bandStr === "unknown") return "Chưa làm bài thi hoặc chưa rõ trình độ hiện tại.";
  const val = Number(bandStr);
  if (val <= 4.5) return "B1 - Sơ trung cấp: Đã có nền tảng cơ bản, cần củng cố từ vựng & cấu trúc câu.";
  if (val <= 5.5) return "B2 - Trung cấp: Giao tiếp ổn định, cần cải thiện phản xạ và độ chính xác.";
  if (val <= 6.5) return "B2+ - Khá: Đạt chuẩn hầu hết đại học quốc tế, cần bứt phá các kỹ năng viết & nói.";
  if (val <= 7.5) return "C1 - Cao cấp: Thành thạo tiếng Anh, tập trung tối ưu điểm Writing Task 2 & Speaking Part 3.";
  return "C2 - Master: Trình độ xuất sắc, sẵn sàng cho các mục tiêu học thuật đỉnh cao.";
}

function SubmitStepButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="group min-w-36 rounded-xl bg-[var(--primary)] text-white shadow-md transition-all hover:bg-[var(--primary-hover)] active:scale-[0.98]"
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          Đang lưu…
        </span>
      ) : (
        <>
          Lưu và tiếp tục
          <ChevronRight
            aria-hidden="true"
            size={18}
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </>
      )}
    </Button>
  );
}

function CompleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      className="group min-w-44 rounded-xl bg-emerald-600 font-bold text-white shadow-lg transition-all hover:bg-emerald-700 active:scale-[0.98]"
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          Đang hoàn tất…
        </span>
      ) : (
        <>
          Hoàn tất thiết lập
          <Check aria-hidden="true" size={19} className="transition-transform group-hover:scale-110" />
        </>
      )}
    </Button>
  );
}

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.[0]) return null;
  return (
    <div
      id={id}
      className="mt-2.5 flex items-center gap-2 rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive-subtle)] px-3 py-2 text-xs font-semibold text-[var(--destructive)]"
    >
      <span className="size-1.5 rounded-full bg-[var(--destructive)]" />
      {errors[0]}
    </div>
  );
}

function StepHeading({
  title,
  description,
  badgeText,
}: {
  title: string;
  description: string;
  badgeText?: string;
}) {
  return (
    <div className="space-y-2">
      {badgeText ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary-subtle)] px-3 py-1 text-xs font-bold text-[var(--primary)] border border-[var(--primary-soft)]/60">
          <Sparkles className="size-3" />
          {badgeText}
        </span>
      ) : null}
      <h1
        id="onboarding-step-title"
        tabIndex={-1}
        className="rounded-md text-2xl font-black tracking-tight text-[var(--foreground)] sm:text-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-4"
      >
        {title}
      </h1>
      <p className="max-w-2xl text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-base">
        {description}
      </p>
    </div>
  );
}

function FormFooter({
  step,
  onBack,
  returnToReview,
}: {
  step: number;
  onBack: () => void;
  returnToReview: boolean;
}) {
  return (
    <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[var(--border)]/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
      <Button
        type="button"
        variant="ghost"
        onClick={onBack}
        className="rounded-xl text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <ChevronLeft aria-hidden="true" size={18} />
        Quay lại
      </Button>
      <input type="hidden" name="step" value={step} />
      <input
        type="hidden"
        name="returnToReview"
        value={returnToReview ? "true" : "false"}
      />
      <SubmitStepButton />
    </div>
  );
}

export function OnboardingWizard({
  learnerProfile,
  displayName,
  initialStep,
}: {
  learnerProfile: LearnerProfile | null;
  displayName: string;
  initialStep?: number;
}) {
  const [step, setStep] = useState(() => {
    const persistedStep = learnerProfile?.onboarding_step ?? 1;
    return Math.min(8, Math.max(1, persistedStep, initialStep ?? 1));
  });
  const [values, setValues] = useState(() => initialValues(learnerProfile));
  const [hasExamDate, setHasExamDate] = useState(
    Boolean(learnerProfile?.target_exam_date),
  );
  const [editingFromReview, setEditingFromReview] = useState(false);
  const [saveState, saveAction] = useActionState(
    saveOnboardingStepAction,
    initialActionState,
  );
  const [completeState, completeAction] = useActionState(
    completeOnboardingAction,
    initialActionState,
  );
  const previousRequestId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (
      saveState.status === "success" &&
      saveState.nextStep &&
      saveState.requestId !== previousRequestId.current
    ) {
      previousRequestId.current = saveState.requestId;
      setEditingFromReview(false);
      setStep(saveState.nextStep);
      requestAnimationFrame(() =>
        document.getElementById("onboarding-step-title")?.focus(),
      );
    } else if (
      saveState.status === "error" &&
      saveState.requestId !== previousRequestId.current
    ) {
      previousRequestId.current = saveState.requestId;
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLElement>(
            "[aria-invalid=true], [aria-describedby$='-error']",
          )
          ?.focus(),
      );
    }
  }, [saveState]);

  function moveTo(nextStep: number, fromReview = false) {
    setEditingFromReview(fromReview);
    setStep(nextStep);
    requestAnimationFrame(() =>
      document.getElementById("onboarding-step-title")?.focus(),
    );
  }

  function moveBack(previousStep: number) {
    moveTo(editingFromReview ? 8 : previousStep);
  }

  function toggleSkill(skill: string, checked: boolean) {
    setValues((current) => ({
      ...current,
      prioritySkills: checked
        ? [...current.prioritySkills, skill]
        : current.prioritySkills.filter((item) => item !== skill),
    }));
  }

  const errors = saveState.fieldErrors;
  const message = step === 8 ? completeState : saveState;
  const completedFormSteps = Math.max(0, step - 1);
  const progress = Math.round((completedFormSteps / FORM_STEP_COUNT) * 100);
  const weeklyStudyTime = formatWeeklyStudyTime(
    values.dailyStudyMinutes,
    values.studyDaysPerWeek,
  );

  return (
    <div className="mx-auto w-full max-w-xl lg:max-w-2xl">
      {/* Header Stepper Component */}
      <div className="mb-6 rounded-2xl border border-[var(--border)]/70 bg-[var(--surface)] p-4 shadow-sm backdrop-blur-sm sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-[var(--primary-subtle)] text-[var(--primary)] font-bold text-xs">
              {step === 1 ? "✨" : `${step - 1}/${FORM_STEP_COUNT}`}
            </span>
            <div>
              <p className="text-[11px] font-extrabold tracking-widest text-[var(--primary)] uppercase">
                Hồ sơ học tập
              </p>
              <p className="text-xs font-semibold text-[var(--foreground)] truncate max-w-[200px] sm:max-w-none">
                {step === 1
                  ? "Sẵn sàng bắt đầu"
                  : ONBOARDING_STEPS[step - 1]}
              </p>
            </div>
          </div>
          <span className="rounded-full bg-[var(--primary-subtle)] px-3 py-1 text-xs font-extrabold text-[var(--primary)] border border-[var(--primary-soft)]/50">
            {progress}%
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div
          className="mt-4 h-2.5 overflow-hidden rounded-full bg-[var(--muted)] p-0.5"
          role="progressbar"
          aria-label="Tiến độ thiết lập hồ sơ học tập"
          aria-valuemin={0}
          aria-valuemax={FORM_STEP_COUNT}
          aria-valuenow={completedFormSteps}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] transition-all duration-500 ease-out shadow-xs"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step Indicator Dots */}
        <div className="mt-3 hidden sm:flex items-center justify-between px-1">
          {ONBOARDING_STEPS.map((stepName, idx) => {
            const stepNum = idx + 1;
            const isDone = stepNum < step;
            const isCurrent = stepNum === step;
            return (
              <div
                key={stepName}
                className={cn(
                  "flex items-center gap-1 text-[11px] font-semibold transition-colors",
                  isCurrent
                    ? "text-[var(--primary)] font-extrabold"
                    : isDone
                      ? "text-[var(--foreground)]"
                      : "text-[var(--muted-foreground)]/60",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-full text-[9px]",
                    isCurrent
                      ? "bg-[var(--primary)] text-white ring-2 ring-[var(--primary-soft)]"
                      : isDone
                        ? "bg-[var(--primary-subtle)] text-[var(--primary)] font-bold"
                        : "bg-[var(--muted)] text-[var(--muted-foreground)]",
                  )}
                >
                  {isDone ? "✓" : stepNum}
                </span>
                <span className="hidden md:inline text-[10px]">{stepName}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Form Container Card */}
      <section
        aria-labelledby="onboarding-step-title"
        className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface-raised)] p-6 shadow-[0_20px_60px_rgba(var(--shadow-color)/0.08)] sm:p-9 transition-all duration-300"
      >
        {/* Accent Bar at top of card */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[var(--primary)] via-[var(--accent)] to-indigo-400" />

        {/* STEP 1: WELCOME INTRO */}
        {step === 1 ? (
          <div className="flex flex-col justify-center py-4 text-center sm:py-6">
            <div className="relative mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-[var(--primary)] to-[var(--accent)] text-white shadow-lg shadow-[var(--primary)]/20 transition-transform duration-300 hover:scale-105">
              <Sparkles aria-hidden="true" size={30} strokeWidth={1.8} />
              <div className="absolute -inset-1 -z-10 rounded-2xl bg-[var(--primary)]/20 blur-md" />
            </div>

            <StepHeading
              badgeText="Chào mừng bạn đến với IELTS Flow"
              title={`Chào ${displayName || "bạn"}, hãy thiết lập hồ sơ học của bạn`}
              description="Khoảng 2 phút để IELTS Flow hiểu loại bài thi, mục tiêu và quỹ thời gian của bạn. Mỗi bước được lưu riêng để bạn có thể tiếp tục sau."
            />

            {/* Feature Badges Grid */}
            <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border)]/70 bg-[var(--surface)] p-4 shadow-xs">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--primary-subtle)] text-[var(--primary)] mb-2">
                  <Zap size={18} />
                </div>
                <p className="text-xs font-bold text-[var(--foreground)]">⚡ Nhanh chóng</p>
                <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">Chỉ mất 2 phút thiết lập đơn giản</p>
              </div>

              <div className="rounded-2xl border border-[var(--border)]/70 bg-[var(--surface)] p-4 shadow-xs">
                <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 mb-2">
                  <Compass size={18} />
                </div>
                <p className="text-xs font-bold text-[var(--foreground)]">🎯 Đúng mục tiêu</p>
                <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">Tự động chọn lộ trình bài học</p>
              </div>

              <div className="rounded-2xl border border-[var(--border)]/70 bg-[var(--surface)] p-4 shadow-xs">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 mb-2">
                  <ShieldCheck size={18} />
                </div>
                <p className="text-xs font-bold text-[var(--foreground)]">🔒 Lưu tự động</p>
                <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">Thay đổi bất kỳ lúc nào trong Hồ sơ</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-[var(--border)]/80 bg-[var(--primary-subtle)]/40 p-4 text-left text-xs leading-relaxed text-[var(--muted-foreground)] sm:text-sm">
              💡 <strong>IELTS Flow</strong> dùng thông tin này để sắp xếp nội dung, nhịp học và kỹ năng cần ưu tiên. Bạn có thể thay đổi bất cứ lúc nào trong Hồ sơ.
            </div>

            <Button asChild size="lg" className="mt-8 w-full rounded-2xl bg-[var(--primary)] text-white shadow-lg transition-all hover:bg-[var(--primary-hover)] active:scale-[0.98]">
              <Link
                href="/onboarding?step=2"
                onClick={(event) => {
                  event.preventDefault();
                  moveTo(2);
                }}
                className="flex items-center justify-center gap-2 text-base font-bold"
              >
                Bắt đầu thiết lập
                <ChevronRight aria-hidden="true" size={20} />
              </Link>
            </Button>
          </div>
        ) : null}

        {/* STEP 2: TEST TYPE */}
        {step === 2 ? (
          <form action={saveAction} noValidate>
            <StepHeading
              badgeText="Bước 1 / 6"
              title="Bạn đang chuẩn bị cho loại bài thi nào?"
              description="Academic và General Training có phần Reading, Writing khác nhau nên cần xác định ngay từ đầu."
            />

            <fieldset className="mt-7 grid gap-4 sm:grid-cols-2">
              <legend className="sr-only">Loại bài thi IELTS</legend>
              {Object.entries(TEST_TYPE_LABELS).map(([value, label]) => {
                const isSelected = values.testType === value;
                return (
                  <label
                    key={value}
                    className={cn(
                      "group relative flex cursor-pointer flex-col justify-between rounded-2xl border p-5 transition-all duration-200 focus-within:ring-2 focus-within:ring-[var(--ring)] focus-within:ring-offset-2",
                      isSelected
                        ? "border-[var(--primary)] bg-[var(--primary-subtle)]/70 shadow-md ring-2 ring-[var(--primary)]/30"
                        : "border-[var(--border-strong)] bg-[var(--surface)] hover:border-[var(--primary)]/60 hover:shadow-xs",
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className={cn(
                            "flex size-11 items-center justify-center rounded-xl transition-colors",
                            isSelected
                              ? "bg-[var(--primary)] text-white"
                              : "bg-[var(--muted)] text-[var(--muted-foreground)] group-hover:bg-[var(--primary-subtle)] group-hover:text-[var(--primary)]",
                          )}
                        >
                          {value === "academic" ? (
                            <GraduationCap size={22} />
                          ) : (
                            <Briefcase size={22} />
                          )}
                        </div>
                        <input
                          type="radio"
                          name="testType"
                          value={value}
                          checked={isSelected}
                          onChange={() =>
                            setValues((current) => ({ ...current, testType: value }))
                          }
                          aria-describedby={
                            errors?.testType?.[0] ? "testType-error" : undefined
                          }
                          className="size-5 accent-[var(--primary)]"
                        />
                      </div>
                      <span className="block text-base font-extrabold text-[var(--foreground)]">
                        {label}
                      </span>
                      <span className="mt-1.5 block text-xs leading-relaxed text-[var(--muted-foreground)]">
                        {value === "academic"
                          ? "Phù hợp mục tiêu đại học, sau đại học hoặc đăng ký nghề nghiệp."
                          : "Phù hợp mục tiêu định cư hoặc đào tạo dưới bậc đại học."}
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[var(--border)]/50">
                      <span
                        className={cn(
                          "inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                          isSelected
                            ? "bg-[var(--primary)] text-white"
                            : "bg-[var(--muted)] text-[var(--muted-foreground)]",
                        )}
                      >
                        {value === "academic" ? "Phổ biến nhất" : "Định cư / Đào tạo"}
                      </span>
                    </div>
                  </label>
                );
              })}
            </fieldset>

            <FieldError id="testType-error" errors={errors?.testType} />
            <FormFooter
              step={2}
              onBack={() => moveBack(1)}
              returnToReview={editingFromReview}
            />
          </form>
        ) : null}

        {/* STEP 3: CURRENT BAND */}
        {step === 3 ? (
          <form action={saveAction} noValidate>
            <StepHeading
              badgeText="Bước 2 / 6"
              title="Band hiện tại của bạn là bao nhiêu?"
              description="Chọn kết quả gần nhất. Nếu chưa từng thi hoặc chưa làm bài đánh giá, bạn có thể chọn chưa xác định."
            />

            <div className="mt-7 space-y-6">
              {/* Bound HTML Select for Form Action & Tests */}
              <div>
                <label htmlFor="currentBand" className="block text-sm font-bold text-[var(--foreground)]">
                  Band hiện tại
                </label>
                <select
                  id="currentBand"
                  name="currentBand"
                  value={values.currentBand}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, currentBand: event.target.value }))
                  }
                  aria-invalid={Boolean(errors?.currentBand?.[0])}
                  aria-describedby={errors?.currentBand?.[0] ? "currentBand-error" : undefined}
                  className="mt-2 h-12 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm font-semibold focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                >
                  <option value="unknown">Chưa xác định</option>
                  {BAND_SCORES.map((band) => (
                    <option key={band} value={band}>
                      {band.toFixed(1)}
                    </option>
                  ))}
                </select>
                <FieldError id="currentBand-error" errors={errors?.currentBand} />
              </div>

              {/* Interactive Visual Quick Picker Grid */}
              <div>
                <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2.5">
                  Chọn nhanh trình độ
                </p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                  <button
                    type="button"
                    onClick={() => setValues((c) => ({ ...c, currentBand: "unknown" }))}
                    className={cn(
                      "col-span-2 sm:col-span-1 rounded-xl border py-2.5 px-3 text-xs font-bold transition-all",
                      values.currentBand === "unknown"
                        ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-xs"
                        : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--primary)]/60",
                    )}
                  >
                    Chưa xác định
                  </button>
                  {BAND_SCORES.map((band) => {
                    const strVal = String(band);
                    const isSelected = values.currentBand === strVal;
                    return (
                      <button
                        key={band}
                        type="button"
                        onClick={() => setValues((c) => ({ ...c, currentBand: strVal }))}
                        className={cn(
                          "rounded-xl border py-2.5 text-center text-sm font-bold transition-all",
                          isSelected
                            ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-xs scale-[1.03]"
                            : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--primary)]/60",
                        )}
                      >
                        {band.toFixed(1)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Band Description Card */}
              <div className="rounded-2xl border border-[var(--primary-soft)] bg-[var(--primary-subtle)] p-4">
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[var(--primary)]">
                  <BookOpen size={16} />
                  <span>Đánh giá trình độ</span>
                </div>
                <p className="mt-2 text-xs font-medium leading-relaxed text-[var(--foreground)] sm:text-sm">
                  {getBandDescription(values.currentBand)}
                </p>
              </div>
            </div>

            <FormFooter
              step={3}
              onBack={() => moveBack(2)}
              returnToReview={editingFromReview}
            />
          </form>
        ) : null}

        {/* STEP 4: TARGET BAND & PRIMARY GOAL */}
        {step === 4 ? (
          <form action={saveAction} noValidate>
            <StepHeading
              badgeText="Bước 3 / 6"
              title="Bạn muốn đạt band nào và để làm gì?"
              description="Mục tiêu rõ ràng giúp IELTS Flow định hướng đúng mức độ và kỹ năng cần tập trung."
            />

            <div className="mt-7 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="targetBand" className="block text-sm font-bold text-[var(--foreground)]">
                    Band mục tiêu
                  </label>
                  <select
                    id="targetBand"
                    name="targetBand"
                    value={values.targetBand}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, targetBand: event.target.value }))
                    }
                    aria-invalid={Boolean(errors?.targetBand?.[0])}
                    aria-describedby={errors?.targetBand?.[0] ? "targetBand-error" : undefined}
                    className="mt-2 h-12 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm font-semibold focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                  >
                    <option value="">Chọn band mục tiêu</option>
                    {BAND_SCORES.map((band) => (
                      <option key={band} value={band}>
                        {band.toFixed(1)}
                      </option>
                    ))}
                  </select>
                  <FieldError id="targetBand-error" errors={errors?.targetBand} />
                </div>

                <div>
                  <label htmlFor="primaryGoal" className="block text-sm font-bold text-[var(--foreground)]">
                    Mục tiêu chính
                  </label>
                  <select
                    id="primaryGoal"
                    name="primaryGoal"
                    value={values.primaryGoal}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, primaryGoal: event.target.value }))
                    }
                    aria-invalid={Boolean(errors?.primaryGoal?.[0])}
                    aria-describedby={errors?.primaryGoal?.[0] ? "primaryGoal-error" : undefined}
                    className="mt-2 h-12 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm font-semibold focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                  >
                    <option value="">Chọn mục tiêu</option>
                    {PRIMARY_GOALS.map((goal) => (
                      <option key={goal} value={goal}>
                        {GOAL_LABELS[goal]}
                      </option>
                    ))}
                  </select>
                  <FieldError id="primaryGoal-error" errors={errors?.primaryGoal} />
                </div>
              </div>

              {/* Visual Goal Choice Cards */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-2.5">
                  Chọn nhanh mục tiêu học
                </p>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {PRIMARY_GOALS.map((goal) => {
                    const isSelected = values.primaryGoal === goal;
                    const goalIcons: Record<string, React.ComponentType<{ className?: string }>> = {
                      university: GraduationCap,
                      graduation: Award,
                      study_abroad: Globe,
                      work: Briefcase,
                      immigration: Compass,
                      personal_development: Zap,
                      other: Sparkles,
                    };
                    const GoalIcon = goalIcons[goal] || Award;

                    return (
                      <button
                        key={goal}
                        type="button"
                        onClick={() => setValues((c) => ({ ...c, primaryGoal: goal }))}
                        className={cn(
                          "flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all",
                          isSelected
                            ? "border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--primary)] font-bold shadow-xs ring-2 ring-[var(--primary)]/30"
                            : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--primary)]/60",
                        )}
                      >
                        <GoalIcon className={cn("size-5 mb-1.5", isSelected ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")} />
                        <span className="text-xs font-bold leading-tight">{GOAL_LABELS[goal]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <FormFooter
              step={4}
              onBack={() => moveBack(3)}
              returnToReview={editingFromReview}
            />
          </form>
        ) : null}

        {/* STEP 5: TARGET EXAM DATE */}
        {step === 5 ? (
          <form action={saveAction} noValidate>
            <StepHeading
              badgeText="Bước 4 / 6"
              title="Bạn dự kiến thi khi nào?"
              description="Ngày thi là tùy chọn. Bạn có thể bổ sung hoặc thay đổi sau trong hồ sơ."
            />

            <div className="mt-7 max-w-md space-y-5">
              {hasExamDate ? (
                <div>
                  <label
                    htmlFor="targetExamDate"
                    className="block text-sm font-bold text-[var(--foreground)]"
                  >
                    Ngày thi dự kiến
                  </label>
                  <div className="relative mt-2">
                    <input
                      id="targetExamDate"
                      name="targetExamDate"
                      type="date"
                      value={values.targetExamDate}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          targetExamDate: event.target.value,
                        }))
                      }
                      aria-invalid={Boolean(errors?.targetExamDate?.[0])}
                      aria-describedby={
                        errors?.targetExamDate?.[0]
                          ? "targetExamDate-error"
                          : undefined
                      }
                      className="h-12 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm font-semibold focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                    />
                  </div>
                  <FieldError
                    id="targetExamDate-error"
                    errors={errors?.targetExamDate}
                  />

                  {/* Preset Shortcuts */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      { label: "Trong 3 tháng", months: 3 },
                      { label: "Trong 6 tháng", months: 6 },
                      { label: "Trong 1 năm", months: 12 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          const date = new Date();
                          date.setMonth(date.getMonth() + preset.months);
                          const formatted = date.toISOString().split("T")[0];
                          setValues((c) => ({ ...c, targetExamDate: formatted }));
                        }}
                        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                      >
                        + {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <input type="hidden" name="targetExamDate" value="" />
              )}

              <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-sm font-bold text-[var(--foreground)] transition-colors hover:border-[var(--primary)]">
                <input
                  type="checkbox"
                  checked={!hasExamDate}
                  onChange={(event) => {
                    setHasExamDate(!event.target.checked);
                    if (event.target.checked)
                      setValues((current) => ({
                        ...current,
                        targetExamDate: "",
                      }));
                  }}
                  className="size-4 accent-[var(--primary)]"
                />
                <Calendar className="size-4 text-[var(--muted-foreground)]" />
                Chưa xác định ngày thi
              </label>
            </div>

            <FormFooter
              step={5}
              onBack={() => moveBack(4)}
              returnToReview={editingFromReview}
            />
          </form>
        ) : null}

        {/* STEP 6: TIME COMMITMENT */}
        {step === 6 ? (
          <form action={saveAction} noValidate>
            <StepHeading
              badgeText="Bước 5 / 6"
              title="Quỹ thời gian thực tế của bạn là bao nhiêu?"
              description="Chọn lịch bạn có thể duy trì đều đặn, không phải lịch lý tưởng trong một vài ngày."
            />

            <div className="mt-7 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="dailyStudyMinutes" className="block text-sm font-bold text-[var(--foreground)]">
                    Thời lượng mỗi ngày
                  </label>
                  <select
                    id="dailyStudyMinutes"
                    name="dailyStudyMinutes"
                    value={values.dailyStudyMinutes}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        dailyStudyMinutes: event.target.value,
                      }))
                    }
                    aria-invalid={Boolean(errors?.dailyStudyMinutes?.[0])}
                    aria-describedby={errors?.dailyStudyMinutes?.[0] ? "dailyStudyMinutes-error" : undefined}
                    className="mt-2 h-12 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm font-semibold focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                  >
                    <option value="">Chọn thời lượng</option>
                    {DAILY_STUDY_MINUTES.map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes} phút
                      </option>
                    ))}
                  </select>
                  <FieldError id="dailyStudyMinutes-error" errors={errors?.dailyStudyMinutes} />
                </div>

                <div>
                  <label htmlFor="studyDaysPerWeek" className="block text-sm font-bold text-[var(--foreground)]">
                    Số ngày mỗi tuần
                  </label>
                  <select
                    id="studyDaysPerWeek"
                    name="studyDaysPerWeek"
                    value={values.studyDaysPerWeek}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        studyDaysPerWeek: event.target.value,
                      }))
                    }
                    aria-invalid={Boolean(errors?.studyDaysPerWeek?.[0])}
                    aria-describedby={errors?.studyDaysPerWeek?.[0] ? "studyDaysPerWeek-error" : undefined}
                    className="mt-2 h-12 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm font-semibold focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                  >
                    <option value="">Chọn số ngày</option>
                    {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                      <option key={days} value={days}>
                        {days} ngày / tuần
                      </option>
                    ))}
                  </select>
                  <FieldError id="studyDaysPerWeek-error" errors={errors?.studyDaysPerWeek} />
                </div>
              </div>

              {/* Visual Daily Minutes Chips */}
              <div>
                <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2.5">
                  Chọn thời lượng hàng ngày
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {DAILY_STUDY_MINUTES.map((minutes) => {
                    const strVal = String(minutes);
                    const isSelected = values.dailyStudyMinutes === strVal;
                    return (
                      <button
                        key={minutes}
                        type="button"
                        onClick={() => setValues((c) => ({ ...c, dailyStudyMinutes: strVal }))}
                        className={cn(
                          "rounded-xl border py-2.5 text-center text-xs font-bold transition-all",
                          isSelected
                            ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-xs"
                            : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--primary)]/60",
                        )}
                      >
                        {minutes}p
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Visual Days Per Week Chips */}
              <div>
                <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2.5">
                  Chọn số ngày học mỗi tuần
                </p>
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((days) => {
                    const strVal = String(days);
                    const isSelected = values.studyDaysPerWeek === strVal;
                    return (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setValues((c) => ({ ...c, studyDaysPerWeek: strVal }))}
                        className={cn(
                          "rounded-xl border py-2 text-center text-xs font-bold transition-all",
                          isSelected
                            ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-xs"
                            : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--primary)]/60",
                        )}
                      >
                        {days}N
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Calculation Banner */}
              {weeklyStudyTime ? (
                <div className="rounded-2xl border border-[var(--primary-soft)] bg-[var(--primary-subtle)] p-4">
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[var(--primary)]">
                    <Clock size={16} />
                    <span>Tổng thời gian học</span>
                  </div>
                  <p className="mt-1 text-base font-extrabold text-[var(--foreground)]">
                    🎯 {weeklyStudyTime}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    Quỹ thời gian lý tưởng để duy trì sự tiến bộ bền vững mà không bị kiệt sức.
                  </p>
                </div>
              ) : null}
            </div>

            <FormFooter
              step={6}
              onBack={() => moveBack(5)}
              returnToReview={editingFromReview}
            />
          </form>
        ) : null}

        {/* STEP 7: PRIORITY SKILLS */}
        {step === 7 ? (
          <form action={saveAction} noValidate>
            <StepHeading
              badgeText="Bước 6 / 6"
              title="Bạn muốn ưu tiên kỹ năng nào?"
              description="Chọn kỹ năng cần tập trung, hoặc học cân bằng nếu bạn chưa xác định điểm yếu."
            />

            <fieldset className="mt-7 grid gap-3.5 sm:grid-cols-2">
              <legend className="sr-only">Kỹ năng ưu tiên</legend>
              {PRIORITY_SKILLS.map((skill) => {
                const checked = values.prioritySkills.includes(skill);
                const skillIcons = {
                  listening: Headphones,
                  reading: BookOpen,
                  writing: PenTool,
                  speaking: Mic,
                };
                const SkillIcon = skillIcons[skill] || Sparkles;

                return (
                  <label
                    key={skill}
                    className={cn(
                      "group flex min-h-16 cursor-pointer items-center justify-between rounded-2xl border px-5 py-4 transition-all duration-200 focus-within:ring-2 focus-within:ring-[var(--ring)] focus-within:ring-offset-2",
                      checked
                        ? "border-[var(--primary)] bg-[var(--primary-subtle)]/80 text-[var(--primary)] shadow-sm ring-2 ring-[var(--primary)]/30"
                        : "border-[var(--border-strong)] bg-[var(--surface)] hover:border-[var(--primary)]/60",
                    )}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={cn(
                          "flex size-10 items-center justify-center rounded-xl transition-colors",
                          checked
                            ? "bg-[var(--primary)] text-white"
                            : "bg-[var(--muted)] text-[var(--muted-foreground)] group-hover:bg-[var(--primary-subtle)] group-hover:text-[var(--primary)]",
                        )}
                      >
                        <SkillIcon size={20} />
                      </div>
                      <span className="font-extrabold text-base text-[var(--foreground)]">
                        {SKILL_LABELS[skill]}
                      </span>
                    </div>

                    <input
                      type="checkbox"
                      name="prioritySkills"
                      value={skill}
                      checked={checked}
                      onChange={(event) =>
                        toggleSkill(skill, event.target.checked)
                      }
                      aria-invalid={Boolean(errors?.prioritySkills?.[0])}
                      aria-describedby={
                        errors?.prioritySkills?.[0]
                          ? "prioritySkills-error"
                          : undefined
                      }
                      className="size-5 accent-[var(--primary)]"
                    />
                  </label>
                );
              })}
            </fieldset>

            <Button
              type="button"
              variant="secondary"
              className="mt-5 rounded-xl font-bold hover:bg-[var(--primary-subtle)] hover:text-[var(--primary)]"
              onClick={() =>
                setValues((current) => ({
                  ...current,
                  prioritySkills: ALL_PRIORITY_SKILLS,
                }))
              }
            >
              <Sparkles size={16} className="text-[var(--primary)]" />
              Học cân bằng 4 kỹ năng
            </Button>
            <FieldError
              id="prioritySkills-error"
              errors={errors?.prioritySkills}
            />

            <FormFooter
              step={7}
              onBack={() => moveBack(6)}
              returnToReview={editingFromReview}
            />
          </form>
        ) : null}

        {/* STEP 8: REVIEW & CONFIRM */}
        {step === 8 ? (
          <div>
            <StepHeading
              badgeText="Xác nhận thiết lập"
              title="Kiểm tra lại thiết lập của bạn"
              description="Hoàn tất sẽ mở không gian học tập. Bạn vẫn có thể thay đổi các ưu tiên này trong hồ sơ."
            />

            <dl className="mt-7 divide-y divide-[var(--border)]/70 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              {[
                [
                  "Loại bài thi",
                  isTestType(values.testType)
                    ? TEST_TYPE_LABELS[values.testType]
                    : "Chưa chọn",
                  2,
                  "Sửa loại bài thi",
                ],
                [
                  "Band hiện tại",
                  values.currentBand === "unknown"
                    ? "Chưa xác định"
                    : values.currentBand,
                  3,
                  "Sửa band hiện tại",
                ],
                ["Band mục tiêu", values.targetBand || "Chưa chọn", 4, "Sửa band mục tiêu"],
                [
                  "Mục tiêu",
                  isPrimaryGoal(values.primaryGoal)
                    ? GOAL_LABELS[values.primaryGoal]
                    : "Chưa chọn",
                  4,
                  "Sửa mục tiêu",
                ],
                ["Ngày thi", formatExamDate(values.targetExamDate), 5, "Sửa ngày thi"],
                [
                  "Lịch học",
                  values.dailyStudyMinutes && values.studyDaysPerWeek
                    ? `${values.dailyStudyMinutes} phút · ${values.studyDaysPerWeek} ngày/tuần`
                    : "Chưa chọn",
                  6,
                  "Sửa lịch học",
                ],
                [
                  "Kỹ năng ưu tiên",
                  values.prioritySkills
                    .map((skill) =>
                      isPrioritySkill(skill) ? SKILL_LABELS[skill] : skill,
                    )
                    .join(", ") || "Chưa chọn",
                  7,
                  "Sửa kỹ năng ưu tiên",
                ],
              ].map(([label, value, editStep, ariaLabel]) => (
                <div
                  key={String(label)}
                  className="grid gap-2 px-4 py-4 sm:grid-cols-[11rem_1fr_auto] sm:items-center sm:px-5 hover:bg-[var(--muted)]/40 transition-colors"
                >
                  <dt className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                    {label}
                  </dt>
                  <dd className="font-extrabold text-sm text-[var(--foreground)]">{value}</dd>
                  <dd>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => moveTo(Number(editStep), true)}
                      aria-label={String(ariaLabel)}
                      className="rounded-lg text-xs font-bold text-[var(--primary)] hover:bg-[var(--primary-subtle)]"
                    >
                      Sửa
                    </Button>
                  </dd>
                </div>
              ))}
            </dl>

            {weeklyStudyTime ? (
              <div className="mt-5 rounded-2xl border border-[var(--primary-soft)] bg-gradient-to-r from-[var(--primary-subtle)] to-indigo-50/50 p-5 shadow-xs">
                <p className="text-xs font-extrabold tracking-widest text-[var(--primary)] uppercase flex items-center gap-1.5">
                  <Flame size={14} />
                  Nhịp học dự kiến
                </p>
                <p className="mt-2 text-xl font-black text-[var(--foreground)]">
                  {weeklyStudyTime}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">
                  IELTS Flow sẽ dùng quỹ thời gian này để ưu tiên nội dung phù hợp.
                </p>
              </div>
            ) : null}

            <form
              action={completeAction}
              className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <Button
                type="button"
                variant="ghost"
                onClick={() => moveTo(7)}
                className="rounded-xl text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
              >
                <ChevronLeft aria-hidden="true" size={18} />
                Quay lại
              </Button>
              <CompleteButton />
            </form>
          </div>
        ) : null}

        {/* Error Notification */}
        <div aria-live="polite" aria-atomic="true" className="mt-5">
          {message.status === "error" && message.message ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-[var(--destructive-soft)] bg-[var(--destructive-subtle)] p-4 text-xs font-semibold text-[var(--destructive)]"
            >
              <div className="mt-0.5 size-2 rounded-full bg-[var(--destructive)]" />
              <div>
                <p className="font-bold">{message.message}</p>
                {message.requestId ? (
                  <span className="mt-1 block text-[11px] opacity-80">
                    Mã yêu cầu: {message.requestId}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
