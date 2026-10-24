import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { DashboardClient } from "./client";

// Mock vocabulary actions
vi.mock("@/features/learning/vocabulary-actions", () => ({
  saveVocabAction: vi.fn().mockResolvedValue({ success: true }),
  checkWordInVaultAction: vi.fn().mockResolvedValue({ success: true, inVault: false }),
  getSavedVaultTermsAction: vi.fn().mockResolvedValue({ success: true, terms: [] }),
}));

describe("DashboardClient component", () => {
  const defaultProps = {
    accountLabel: "Trường Hoàng",
    firstName: "Trường",
    level: { code: "A2", label: "Elementary", progress: 35 },
    dailyMinutes: 20,
    nextLesson: {
      skillTitle: "Grammar",
      title: "Grammar",
      description: "Rules and structure drills. 5 new lessons are waiting.",
      href: "/learn/grammar",
    },
    progress: 45,
    overview: { completedLessons: 0 },
    streak: 12,
    xp: 1450,
    dailyGoal: { current: 2, total: 4 },
    weekData: [15, 30, 45, 20, 0, 40, 25],
    planItems: [],
    wordOfTheDay: {
      word: "Resilience",
      phonetics: "/rɪˈzɪl.jəns/",
      type: "noun",
      level: "C1",
      definition: "The capacity to recover quickly from difficulties; toughness.",
      example: "She showed resilience.",
    },
    heatData: Array(126).fill(0),
    hasStreakFreeze: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders hero greeting with user name, streak, and XP", () => {
    render(<DashboardClient {...defaultProps} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Trường/);
    expect(screen.getByText(/12-day streak/i)).toBeInTheDocument();
    
    const heroSection = screen.getByLabelText(/welcome and statistics summary/i);
    expect(within(heroSection).getByText(/1,450/)).toBeInTheDocument();
  });

  it("renders Continue Hero Banner with title and CTA button", () => {
    render(<DashboardClient {...defaultProps} />);

    expect(screen.getByText("Pick up where you left off")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Grammar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue Grammar" })).toHaveAttribute("href", "/learn/grammar");
  });

  it("renders Stats Strip with CEFR ladder", () => {
    render(<DashboardClient {...defaultProps} />);

    expect(screen.getByText("Lessons done")).toBeInTheDocument();
    expect(screen.getByText("A2 Elementary")).toBeInTheDocument();
    expect(screen.getByText("35% to B1")).toBeInTheDocument();
    expect(screen.getByText("A1")).toBeInTheDocument();
    expect(screen.getByText("C2")).toBeInTheDocument();
  });

  it("renders Today's Plan with all core practice rows", () => {
    render(<DashboardClient {...defaultProps} />);

    expect(screen.getByRole("heading", { level: 2, name: /today's plan/i })).toBeInTheDocument();
    expect(screen.getByText("Vocabulary")).toBeInTheDocument();
    expect(screen.getByText("Completed ✓")).toBeInTheDocument();
    expect(screen.getByText("Listening")).toBeInTheDocument();
    expect(screen.getByText("Dictation")).toBeInTheDocument();
    expect(screen.getByText("Review mistakes")).toBeInTheDocument();
  });

  it("renders Study Heatmap with active days and total hours", () => {
    render(<DashboardClient {...defaultProps} />);

    expect(screen.getByRole("heading", { level: 2, name: /study heatmap/i })).toBeInTheDocument();
    expect(screen.getByText("32")).toBeInTheDocument();
    expect(screen.getByText("active days")).toBeInTheDocument();
    expect(screen.getByText("13h 0m")).toBeInTheDocument();
  });

  it("supports interactive Quick Practice flip and advance", () => {
    render(<DashboardClient {...defaultProps} />);

    // Shows question with tap to flip
    expect(screen.getByText("Tap to flip")).toBeInTheDocument();
    const flipButton = screen.getByRole("button", { name: /tap to flip/i });

    // Flip card
    fireEvent.click(flipButton);
    expect(screen.getByText(/Answer/i)).toBeInTheDocument();

    // Advance card with 'I knew this'
    const knewButton = screen.getByRole("button", { name: /I knew this/i });
    fireEvent.click(knewButton);
    expect(screen.getByText("Tap to flip")).toBeInTheDocument();
  });

  it("supports English Theory & Tips navigation dots", () => {
    render(<DashboardClient {...defaultProps} />);

    expect(screen.getByRole("heading", { level: 2, name: /english theory and tips/i })).toBeInTheDocument();

    const tipButtons = screen.getAllByRole("button", { name: /view tip/i });
    expect(tipButtons.length).toBe(5);

    // Switch to tip 1
    fireEvent.click(tipButtons[0]);
    expect(screen.getByText("Context over isolated lists")).toBeInTheDocument();
    expect(screen.getAllByText("Vocabulary").length).toBeGreaterThanOrEqual(1);
  });

  it("renders sidebar with Daily Goal, Word of the Day, and Weekly League", async () => {
    const { saveVocabAction } = await import("@/features/learning/vocabulary-actions");

    render(<DashboardClient {...defaultProps} />);

    // Daily goal
    expect(screen.getByRole("heading", { level: 2, name: /daily goal/i })).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    // Word of the day
    const sidebar = screen.getByLabelText(/goals and community/i);
    expect(within(sidebar).getByRole("heading", { level: 2, name: /word of the day/i })).toBeInTheDocument();
    expect(within(sidebar).getByText("Resilience")).toBeInTheDocument();
    expect(within(sidebar).getByText("C1")).toBeInTheDocument();

    // Pronounce audio button
    const speakButton = within(sidebar).getByRole("button", { name: /play pronunciation/i });
    expect(speakButton).toBeInTheDocument();

    // Add to word list
    const addButton = within(sidebar).getByRole("button", { name: /\+ add to my word list/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(saveVocabAction).toHaveBeenCalledWith({ term: "Resilience" });
      expect(within(sidebar).getByText("✓ Added to your word list")).toBeInTheDocument();
    });

    // Weekly league
    expect(within(sidebar).getByRole("heading", { level: 2, name: /weekly league/i })).toBeInTheDocument();
    expect(within(sidebar).getByText("You")).toBeInTheDocument();
    expect(within(sidebar).getByText("Nam Hoàng")).toBeInTheDocument();
    expect(within(sidebar).getByText("Minh Thư")).toBeInTheDocument();
  });
});
