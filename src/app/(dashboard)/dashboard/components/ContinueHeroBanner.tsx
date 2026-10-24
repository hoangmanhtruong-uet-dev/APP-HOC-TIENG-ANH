"use client";

import React from "react";
import Link from "next/link";

interface ContinueHeroBannerProps {
  title?: string;
  description?: string;
  progressPercent?: number;
  href?: string;
  ctaLabel?: string;
}

export function ContinueHeroBanner({
  title = "Grammar",
  description = "Rules and structure drills. 5 new lessons are waiting.",
  progressPercent = 45,
  href = "/learn/grammar",
  ctaLabel,
}: ContinueHeroBannerProps) {
  const label = ctaLabel ?? `Continue ${title}`;

  return (
    <section className="cont">
      <div>
        <small>Pick up where you left off</small>
        <h2>{title}</h2>
        <p>{description}</p>
        <div
          className="bar"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${title} lesson progress: ${progressPercent}%`}
        >
          <i style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <Link href={href} prefetch={false} className="go">
        {label}
      </Link>
    </section>
  );
}
