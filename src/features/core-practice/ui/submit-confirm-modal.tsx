"use client";

import type React from "react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

interface SubmitConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalQuestions: number;
  answeredCount: number;
  isSubmitting?: boolean;
  onConfirm: () => void;
}

export function SubmitConfirmModal({
  open,
  onOpenChange,
  totalQuestions,
  answeredCount,
  isSubmitting = false,
  onConfirm,
}: SubmitConfirmModalProps) {
  const unansweredCount = totalQuestions - answeredCount;

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <button
        type="button"
        aria-label="Cancel modal"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="submit-modal-title"
        className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center gap-2 text-xl font-black text-slate-800" id="submit-modal-title">
          {unansweredCount > 0 ? (
            <AlertTriangle className="text-amber-500" size={24} />
          ) : null}
          Submit Attempt?
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          {unansweredCount > 0 ? (
            <span>
              You have answered <strong>{answeredCount}</strong> out of{" "}
              <strong>{totalQuestions}</strong> questions. There are still{" "}
              <span className="font-bold text-amber-600">
                {unansweredCount} unanswered questions
              </span>
              .
            </span>
          ) : (
            <span>
              You have answered all <strong>{totalQuestions}</strong> questions!
              Are you ready to submit your attempt?
            </span>
          )}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="rounded-xl font-bold"
          >
            Keep Working
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {isSubmitting ? "Submitting..." : "Confirm & Submit"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
