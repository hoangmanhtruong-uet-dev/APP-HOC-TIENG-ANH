import type React from "react";

export interface BaseQuestion {
  id: string;
  position?: number;
  orderNumber?: number;
  promptMarkdown?: string;
  prompt?: string;
}

export interface PracticeRunnerProps<
  TQuestion extends BaseQuestion,
  TAnswers extends Record<string, unknown> = Record<string, unknown>,
> {
  title: string;
  domain: "reading" | "listening" | "writing" | "speaking" | "general";
  categoryLabel?: string;
  serverNow?: string;
  expiresAt?: string;
  durationMinutes?: number;
  questions: TQuestion[];
  initialAnswers?: Partial<TAnswers>;
  isSubmitting?: boolean;
  onSaveDraft?: (answers: TAnswers) => Promise<boolean | void>;
  onSubmit: (answers: TAnswers) => Promise<void>;
  backHref?: string;
  renderQuestionArea: (props: {
    currentQuestion: TQuestion;
    currentIndex: number;
    answers: TAnswers;
    setAnswer: (id: string, val: any) => void;
  }) => React.ReactNode;
  renderSidePanel?: () => React.ReactNode;
  renderTopHeaderExtra?: () => React.ReactNode;
  renderFooterExtra?: () => React.ReactNode;
}
