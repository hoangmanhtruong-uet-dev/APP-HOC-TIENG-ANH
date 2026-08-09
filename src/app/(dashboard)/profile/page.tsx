import {
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  LockKeyhole,
  UserRound,
} from "lucide-react";
import type { Metadata } from "next";

import { LogoutButton } from "@/components/auth/logout-button";
import { LearningPreferencesForm } from "@/components/profile/learning-preferences-form";
import { ProfileForm } from "@/components/profile/profile-form";
import { ErrorState } from "@/components/shared/error-state";
import { requireCurrentAccount } from "@/server/auth/account";
import { getCurrentLearnerProfile } from "@/server/onboarding/learner-profile";

export const metadata: Metadata = { title: "Profile & settings" };

function getLevel(currentBand: number | null | undefined) {
  if (currentBand === null || currentBand === undefined || currentBand < 4)
    return "A1 Beginner";
  if (currentBand < 5) return "A2 Elementary";
  return "B1 Intermediate";
}

export default async function ProfilePage() {
  const [account, learnerProfile] = await Promise.all([
    requireCurrentAccount(),
    getCurrentLearnerProfile(),
  ]);
  if (!account.profile)
    return (
      <ErrorState
        title="Profile unavailable"
        description="Your account is signed in, but its public profile has not been created yet."
      />
    );

  const displayName =
    account.profile.display_name || account.user.email.split("@")[0];
  const level = getLevel(learnerProfile?.current_band);

  return (
    <div className="min-h-[100dvh] bg-[#fbf9ff] pb-8 lg:mx-auto lg:min-h-[calc(100dvh-4.5rem)] lg:max-w-3xl lg:rounded-2xl lg:border lg:border-[var(--border)] lg:shadow-[0_18px_50px_rgb(var(--shadow-color)/0.06)]">
      <header className="flex min-h-14 items-center border-b border-[var(--border)] bg-white px-4 lg:rounded-t-2xl">
        <UserRound size={17} className="text-[var(--primary)]" />
        <h1 className="ml-3 flex-1 text-base font-extrabold text-[var(--primary)]">
          Profile
        </h1>
        <Bell size={17} className="text-[var(--primary)]" />
      </header>

      <main className="space-y-4 px-4 py-5 sm:px-6">
        <section className="rounded-2xl border border-[var(--border)] bg-white p-5 text-center shadow-[0_8px_24px_rgb(var(--shadow-color)/0.05)]">
          <div className="mx-auto grid size-20 place-items-center rounded-full bg-[var(--primary-subtle)] text-2xl font-extrabold text-[var(--primary)] shadow-lg ring-4 ring-white">
            {displayName.slice(0, 1).toUpperCase()}
          </div>
          <h2 className="mt-4 text-xl font-extrabold">{displayName}</h2>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Learning English one step at a time
          </p>
          <div className="mx-auto mt-4 grid max-w-sm grid-cols-2 gap-3">
            <div className="rounded-xl border border-[var(--primary-soft)] bg-[var(--primary-subtle)] p-3">
              <BookOpen size={16} className="mx-auto text-[var(--primary)]" />
              <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
                Current level
              </p>
              <strong className="text-xs">{level}</strong>
            </div>
            <div className="rounded-xl border border-[var(--primary-soft)] bg-[var(--primary-subtle)] p-3">
              <CalendarDays
                size={16}
                className="mx-auto text-[var(--primary)]"
              />
              <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
                Study plan
              </p>
              <strong className="text-xs">
                {learnerProfile?.study_days_per_week ?? 0} days / week
              </strong>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
          <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--primary-subtle)] px-4 py-3 text-[var(--primary)]">
            <UserRound size={17} />
            <h2 className="text-sm font-extrabold">Personal information</h2>
          </div>
          <div className="p-4">
            <ProfileForm displayName={account.profile.display_name ?? ""} />
          </div>
        </section>

        {learnerProfile?.onboarding_completed_at ? (
          <details
            open
            className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-white"
          >
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 bg-[var(--primary-subtle)] px-4 py-3 text-[var(--primary)] [&::-webkit-details-marker]:hidden">
              <BookOpen size={17} />
              <span className="flex-1 text-sm font-extrabold">
                Learning preferences
              </span>
              <span className="text-xs group-open:hidden">Open</span>
            </summary>
            <div className="p-4">
              <LearningPreferencesForm profile={learnerProfile} />
            </div>
          </details>
        ) : null}

        <section className="rounded-2xl border border-[var(--border)] bg-white">
          <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--primary-subtle)] px-4 py-3 text-[var(--primary)]">
            <LockKeyhole size={17} />
            <h2 className="text-sm font-extrabold">Account & security</h2>
          </div>
          <dl className="divide-y divide-[var(--border)] px-4 text-sm">
            <div className="py-4">
              <dt className="text-xs text-[var(--muted-foreground)]">
                Email address
              </dt>
              <dd
                data-testid="account-email"
                className="mt-1 flex items-center gap-2 font-semibold break-all"
              >
                {account.user.email}
                {account.user.emailConfirmedAt ? (
                  <CheckCircle2
                    size={15}
                    className="shrink-0 text-[var(--success)]"
                  />
                ) : null}
              </dd>
            </div>
          </dl>
          <div className="border-t border-[var(--border)] p-4">
            <LogoutButton className="w-full justify-center" />
          </div>
        </section>
      </main>
    </div>
  );
}
