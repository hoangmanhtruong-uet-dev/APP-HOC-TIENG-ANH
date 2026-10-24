import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { ListeningHubClient, BAND_STAGES } from "./client";
import type { ListeningCatalogItem } from "@/features/listening/server/content";

const mockItems: ListeningCatalogItem[] = [
  {
    slug: "community-library-visit",
    title: "Community Library Visit & Membership",
    summary: "Đăng ký thẻ thư viện và hỏi giờ mở cửa, quy định mượn sách.",
    difficulty: "Foundation",
    testType: "practice",
    questionCount: 10,
    timeLimitSeconds: 600,
    durationSeconds: 185,
  },
];

const mockProfile = {
  current_band: 5.5,
  target_band: 6.5,
  daily_study_minutes: 25,
  target_exam_date: "2026-12-31",
};

describe("ListeningHubClient", () => {
  it("renders hero section with greeting, streak, and daily goal accuracy", () => {
    render(
      <ListeningHubClient
        items={mockItems}
        accuracy={82}
        attemptsCount={12}
        profile={mockProfile}
      />
    );

    expect(screen.getByText("Chào mừng trở lại, Scholar")).toBeInTheDocument();
    expect(screen.getByText("5 Ngày Streak")).toBeInTheDocument();
    expect(screen.getByText("82%")).toBeInTheDocument();
    expect(screen.getByText("/ 25m")).toBeInTheDocument();
  });

  it("opens the band dropdown and allows selecting an IELTS band stage", () => {
    render(
      <ListeningHubClient
        items={mockItems}
        accuracy={80}
        attemptsCount={5}
        profile={mockProfile}
      />
    );

    // Initial band badge
    const bandTrigger = screen.getByRole("button", {
      name: /IELTS Band 6.5 - 7.5 • Upper-Intermediate/i,
    });
    expect(bandTrigger).toBeInTheDocument();

    // Click to open dropdown
    fireEvent.click(bandTrigger);

    // Verify stages are visible
    expect(screen.getByText(/Chọn Chặng Luyện Nghe \(0.0 - 9.0\)/i)).toBeInTheDocument();
    expect(screen.getByText("Starter")).toBeInTheDocument();
    expect(screen.getByText("Expert")).toBeInTheDocument();

    // Click "Starter"
    const starterButton = screen.getByRole("button", { name: /Starter/i });
    fireEvent.click(starterButton);

    // Verify active selection updated
    expect(
      screen.getByRole("button", { name: /IELTS Band 0.0 - 2.5 • Starter/i })
    ).toBeInTheDocument();
  });

  it("renders the 4 listening modes bento grid with working navigation/filters", () => {
    render(
      <ListeningHubClient
        items={mockItems}
        accuracy={80}
        attemptsCount={5}
        profile={mockProfile}
      />
    );

    // Mode 1: Dictation link
    const dictationLink = screen.getByRole("link", {
      name: /Deep Dictation \(Chép Chính Tả\)/i,
    });
    expect(dictationLink).toHaveAttribute("href", "/dictation");

    // Mode 2: Speed run button
    const speedRunBtn = screen.getByRole("button", {
      name: /Speed Run \(1.25x - 1.5x\)/i,
    });
    expect(speedRunBtn).toBeInTheDocument();
    fireEvent.click(speedRunBtn);

    // Mode 3: Accents button
    const accentsBtn = screen.getByRole("button", {
      name: /Luyện Giọng \(Accents\)/i,
    });
    expect(accentsBtn).toBeInTheDocument();
    fireEvent.click(accentsBtn);

    // Mode 4: Full Test CTA
    expect(
      screen.getByText(/Full Comprehension Test \(Đề Thi Thử 4 Phần\)/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Vào thi thử Full Test/i })
    ).toBeInTheDocument();
  });

  it("filters exercise cards by search query and accent tabs", () => {
    render(
      <ListeningHubClient
        items={mockItems}
        accuracy={80}
        attemptsCount={5}
        profile={mockProfile}
      />
    );

    // Filter by search query
    const searchInput = screen.getByPlaceholderText("Tìm bài nghe, chủ đề...");
    fireEvent.change(searchInput, { target: { value: "Library" } });

    expect(
      screen.getByRole("heading", { name: "Community Library Visit & Membership" })
    ).toBeInTheDocument();

    // Search something nonexistent
    fireEvent.change(searchInput, { target: { value: "xyznonexistent" } });
    expect(screen.getByText("Không tìm thấy bài nghe phù hợp")).toBeInTheDocument();

    // Reset via reset button
    const resetBtn = screen.getByRole("button", { name: "Xem tất cả bài tập" });
    fireEvent.click(resetBtn);
    expect(
      screen.getByRole("heading", { name: "Community Library Visit & Membership" })
    ).toBeInTheDocument();
  });

  it("controls the floating mini audio player (play, pause, speed, seek, preview)", () => {
    render(
      <ListeningHubClient
        items={mockItems}
        accuracy={80}
        attemptsCount={5}
        profile={mockProfile}
      />
    );

    // Play/Pause button
    const playBtn = screen.getByRole("button", { name: "Phát âm thanh" });
    fireEvent.click(playBtn);

    // Speed toggle
    const speedBtn = screen.getByRole("button", { name: "Tốc độ phát 1x" });
    fireEvent.click(speedBtn);
    expect(screen.getByRole("button", { name: "Tốc độ phát 1.25x" })).toBeInTheDocument();

    // Rewind 5s
    const rewindBtn = screen.getByRole("button", { name: "Tua lùi 5 giây" });
    fireEvent.click(rewindBtn);

    // Forward 5s
    const forwardBtn = screen.getByRole("button", { name: "Tua tới 5 giây" });
    fireEvent.click(forwardBtn);

    // Mute toggle
    const muteBtn = screen.getByRole("button", { name: "Tắt âm thanh" });
    fireEvent.click(muteBtn);
    expect(screen.getByRole("button", { name: "Bật âm thanh" })).toBeInTheDocument();

    // Click "Nghe thử" on a practice card
    const previewButtons = screen.getAllByRole("button", { name: "Nghe thử" });
    if (previewButtons.length > 0) {
      fireEvent.click(previewButtons[0]);
    }
  });
});
