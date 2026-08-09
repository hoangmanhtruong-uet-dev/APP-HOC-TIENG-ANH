import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PlacementQuestions } from "@/components/placement/placement-test";
import { savePlacementAnswerAction } from "@/features/placement/actions";

vi.mock("@/features/placement/actions", () => ({
  savePlacementAnswerAction: vi.fn(),
  startPlacementAction: vi.fn(),
  submitPlacementAction: vi.fn(),
  updatePlacementPositionAction: vi.fn(),
}));

const test = {
  id: "10000000-0000-4000-8000-000000000001",
  slug: "english-foundation",
  title: "Placement",
  version: 1,
  questions: [
    {
      id: "10000000-0000-4000-8000-000000000011",
      position: 1,
      skill: "grammar" as const,
      prompt: "Question one",
      options: [
        { id: "a", label: "Answer A" },
        { id: "b", label: "Answer B" },
      ],
    },
    {
      id: "10000000-0000-4000-8000-000000000012",
      position: 2,
      skill: "reading" as const,
      prompt: "Question two",
      options: [
        { id: "c", label: "Answer C" },
        { id: "d", label: "Answer D" },
      ],
    },
  ],
};

const attempt = {
  id: "20000000-0000-4000-8000-000000000001",
  status: "in_progress" as const,
  answers: { [test.questions[0].id]: "a", [test.questions[1].id]: "c" },
  current_position: 2,
  revision: 1,
  updated_at: "2026-08-08T00:00:00.000Z",
};

describe("PlacementQuestions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("hydrates the saved answer and current position", () => {
    render(<PlacementQuestions test={test} attempt={attempt} />);
    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Answer C" })).toBeChecked();
  });

  it("announces a persisted answer", async () => {
    let resolveSave!: (value: {
      status: "saved";
      revision: number;
      currentPosition: number;
    }) => void;
    vi.mocked(savePlacementAnswerAction).mockReturnValue(
      new Promise((resolve) => {
        resolveSave = resolve;
      }),
    );
    render(<PlacementQuestions test={test} attempt={attempt} />);
    fireEvent.click(screen.getByRole("radio", { name: "Answer D" }));
    expect(screen.getByText("Saving…")).toBeInTheDocument();
    resolveSave({ status: "saved", revision: 2, currentPosition: 2 });
    await waitFor(() => expect(screen.getByText("Saved")).toBeInTheDocument());
  });

  it("stays in saving state until the newest queued answer is persisted", async () => {
    const resolvers: Array<
      (value: {
        status: "saved";
        revision: number;
        currentPosition: number;
      }) => void
    > = [];
    vi.mocked(savePlacementAnswerAction).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve);
        }),
    );
    render(<PlacementQuestions test={test} attempt={attempt} />);
    fireEvent.click(screen.getByRole("radio", { name: "Answer D" }));
    fireEvent.click(screen.getByRole("radio", { name: "Answer C" }));

    await waitFor(() => expect(resolvers).toHaveLength(1));
    resolvers[0]({ status: "saved", revision: 2, currentPosition: 2 });
    await waitFor(() => expect(resolvers).toHaveLength(2));
    expect(screen.getByText("Saving…")).toBeInTheDocument();

    resolvers[1]({ status: "saved", revision: 3, currentPosition: 2 });
    await waitFor(() => expect(screen.getByText("Saved")).toBeInTheDocument());
    expect(screen.getByRole("radio", { name: "Answer C" })).toBeChecked();
  });

  it("keeps the optimistic answer and exposes retry on save failure", async () => {
    vi.mocked(savePlacementAnswerAction).mockResolvedValue({
      status: "error",
      message: "Save failed — try again.",
    });
    render(<PlacementQuestions test={test} attempt={attempt} />);
    const answer = screen.getByRole("radio", { name: "Answer D" });
    fireEvent.click(answer);
    await waitFor(() =>
      expect(screen.getByText("Save failed — try again.")).toBeInTheDocument(),
    );
    expect(answer).toBeChecked();
    expect(screen.getByRole("button", { name: "Retry save" })).toBeVisible();
  });

  it("does not allow finish while the latest answer is still saving", async () => {
    let resolveSave!: (value: {
      status: "saved";
      revision: number;
      currentPosition: number;
    }) => void;
    vi.mocked(savePlacementAnswerAction).mockReturnValue(
      new Promise((resolve) => {
        resolveSave = resolve;
      }),
    );
    render(<PlacementQuestions test={test} attempt={attempt} />);
    fireEvent.click(screen.getByRole("radio", { name: "Answer D" }));
    expect(screen.getByRole("button", { name: "Finish test" })).toBeDisabled();

    resolveSave({ status: "saved", revision: 2, currentPosition: 2 });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Finish test" })).toBeEnabled(),
    );
  });
});
