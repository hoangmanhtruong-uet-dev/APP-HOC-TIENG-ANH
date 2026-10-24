"use client";

import React from "react";
import { TrueFalseButtonGroup, type QuestionOption } from "./question-registry/true-false-button-group";
import { InlineBlankInput } from "./question-registry/inline-blank-input";
import { MatchingHeadingsSelector } from "./question-registry/matching-headings-selector";
import { MultipleChoiceCard } from "./question-registry/multiple-choice-card";

export interface DynamicQuestion {
  id: string;
  type: string;
  position?: number;
  promptMarkdown: string;
  options?: QuestionOption[];
}

export interface DynamicDraft {
  answerText: string;
  selectedOptionIds: string[];
}

export interface DynamicQuestionRendererProps {
  question: DynamicQuestion;
  draft: DynamicDraft;
  maxAnswerWords?: number | null;
  onChange: (draft: DynamicDraft) => void;
}

export function DynamicQuestionRenderer({
  question,
  draft,
  maxAnswerWords,
  onChange,
}: DynamicQuestionRendererProps) {
  const qType = (question.type || "").toLowerCase().trim();
  const options = question.options || [];

  // 1. True / False / Not Given & Yes / No / Not Given
  if (
    qType === "true_false_not_given" ||
    qType === "yes_no_not_given" ||
    qType === "true_false"
  ) {
    const isYesNo = qType === "yes_no_not_given" || question.promptMarkdown.includes("YES");
    return (
      <TrueFalseButtonGroup
        questionId={question.id}
        options={options}
        selectedOptionIds={draft.selectedOptionIds}
        answerText={draft.answerText}
        isYesNo={isYesNo}
        onChange={onChange}
      />
    );
  }

  // 2. Summary completion, short text, fill in blanks
  if (
    qType === "summary_completion" ||
    qType === "short_text" ||
    qType === "fill_in_blanks" ||
    qType === "sentence_completion"
  ) {
    return (
      <InlineBlankInput
        questionId={question.id}
        promptMarkdown={question.promptMarkdown}
        answerText={draft.answerText}
        maxAnswerWords={maxAnswerWords}
        onChange={onChange}
      />
    );
  }

  // 3. Matching headings / Matching features
  if (
    qType === "matching_headings" ||
    qType === "matching_features" ||
    qType === "matching_information"
  ) {
    return (
      <MatchingHeadingsSelector
        questionId={question.id}
        options={options}
        selectedOptionIds={draft.selectedOptionIds}
        answerText={draft.answerText}
        onChange={onChange}
      />
    );
  }

  // 4. Multiple Choice & Single Choice (hoặc default)
  const isMultiple = qType === "multiple_choice" && options.length > 4;

  return (
    <MultipleChoiceCard
      questionId={question.id}
      options={options}
      selectedOptionIds={draft.selectedOptionIds}
      isMultiple={isMultiple}
      onChange={onChange}
    />
  );
}
