import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DynamicQuestionRenderer } from "./dynamic-question-renderer";

describe("DynamicQuestionRenderer", () => {
  it("renders TrueFalseButtonGroup when type is true_false_not_given", () => {
    const onChange = vi.fn();
    const question = {
      id: "q1",
      type: "true_false_not_given",
      promptMarkdown: "The climate is changing rapidly.",
      options: [
        { id: "opt-t", label: "TRUE", position: 1 },
        { id: "opt-f", label: "FALSE", position: 2 },
        { id: "opt-ng", label: "NOT GIVEN", position: 3 },
      ],
    };

    render(
      <DynamicQuestionRenderer
        question={question}
        draft={{ answerText: "", selectedOptionIds: [] }}
        onChange={onChange}
      />
    );

    const falseRadio = screen.getByRole("radio", { name: "FALSE" });
    expect(falseRadio).toBeInTheDocument();
    expect(falseRadio).not.toBeChecked();

    fireEvent.click(falseRadio);
    expect(onChange).toHaveBeenCalledWith({
      selectedOptionIds: ["opt-f"],
      answerText: "FALSE",
    });
  });

  it("renders InlineBlankInput with word count when type is summary_completion", () => {
    const onChange = vi.fn();
    const question = {
      id: "q2",
      type: "summary_completion",
      promptMarkdown: "Solar panels convert ___ into electricity.",
    };

    render(
      <DynamicQuestionRenderer
        question={question}
        draft={{ answerText: "sunlight", selectedOptionIds: [] }}
        maxAnswerWords={2}
        onChange={onChange}
      />
    );

    const input = screen.getByPlaceholderText("Điền từ...");
    expect(input).toHaveValue("sunlight");
    expect(screen.getByText(/1\/2 từ/i)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "sunlight and heat today" } });
    expect(onChange).toHaveBeenCalledWith({
      answerText: "sunlight and heat today",
      selectedOptionIds: [],
    });
  });

  it("renders MatchingHeadingsSelector when type is matching_headings", () => {
    const onChange = vi.fn();
    const question = {
      id: "q3",
      type: "matching_headings",
      promptMarkdown: "Section A",
      options: [
        { id: "h1", label: "i. Economic growth", position: 1 },
        { id: "h2", label: "ii. Environmental factors", position: 2 },
      ],
    };

    render(
      <DynamicQuestionRenderer
        question={question}
        draft={{ answerText: "", selectedOptionIds: [] }}
        onChange={onChange}
      />
    );

    expect(screen.getByText(/-- Chọn tiêu đề từ danh sách --/i)).toBeInTheDocument();
  });

  it("renders MultipleChoiceCard for multiple_choice", () => {
    const onChange = vi.fn();
    const question = {
      id: "q4",
      type: "multiple_choice",
      promptMarkdown: "What is the capital of France?",
      options: [
        { id: "opt-a", label: "London", position: 1 },
        { id: "opt-b", label: "Paris", position: 2 },
      ],
    };

    render(
      <DynamicQuestionRenderer
        question={question}
        draft={{ answerText: "", selectedOptionIds: [] }}
        onChange={onChange}
      />
    );

    const parisRadio = screen.getByRole("radio", { name: "Paris" });
    expect(parisRadio).toBeInTheDocument();
    fireEvent.click(parisRadio);
    expect(onChange).toHaveBeenCalledWith({
      selectedOptionIds: ["opt-b"],
      answerText: "Paris",
    });
  });
});
