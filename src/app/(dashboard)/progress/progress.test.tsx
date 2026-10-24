import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { ProgressClient } from "./client";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("ProgressClient component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.print = vi.fn();
  });

  it("renders header, 4 KPI cards, and default 7d metrics correctly", () => {
    render(
      <ProgressClient
        initialStreak={12}
        initialCompletedLessons={38}
        initialTargetBand="7.5"
      />
    );

    // Verify Title & Tag
    expect(screen.getByText("ANALYTICS HUB")).toBeInTheDocument();
    expect(screen.getByText("Báo cáo & Tiến độ học tập")).toBeInTheDocument();

    // Verify 4 Top KPI cards
    expect(screen.getByText("Tổng giờ học")).toBeInTheDocument();
    expect(screen.getByText("24h 45m")).toBeInTheDocument();
    expect(screen.getByText("+12% so với tuần trước")).toBeInTheDocument();

    expect(screen.getByText("Bài học đã xong")).toBeInTheDocument();
    expect(screen.getByText("38")).toBeInTheDocument();
    expect(screen.getByText("/ 120 bài")).toBeInTheDocument();

    expect(screen.getByText("Band dự phóng")).toBeInTheDocument();
    expect(screen.getAllByText("7.0")[0]).toBeInTheDocument();
    expect(screen.getByText("+0.5 tăng")).toBeInTheDocument();

    expect(screen.getByText("Chuỗi liên tục (Streak)")).toBeInTheDocument();
    expect(screen.getByText("12 Ngày")).toBeInTheDocument();

    // Verify AI Smart Insight Banner
    expect(screen.getByText("AI SMART INSIGHT")).toBeInTheDocument();
    expect(
      screen.getByText(/Bạn đang gặp khó khăn nhỏ với cấu trúc phát âm nguyên âm đôi/)
    ).toBeInTheDocument();
  });

  it("switches time ranges dynamically (7d, 30d, all) and updates KPI values", () => {
    render(<ProgressClient />);

    // 1. Switch to Tháng này (30d)
    const monthTab = screen.getByRole("button", { name: "Tháng này" });
    fireEvent.click(monthTab);

    expect(screen.getByText("92h 15m")).toBeInTheDocument();
    expect(screen.getByText("+24% so với tháng trước")).toBeInTheDocument();

    // 2. Switch to Toàn thời gian (all)
    const allTab = screen.getByRole("button", { name: "Toàn thời gian" });
    fireEvent.click(allTab);

    expect(screen.getByText("148h 30m")).toBeInTheDocument();
    expect(screen.getByText("Tổng thời gian tích lũy")).toBeInTheDocument();
  });

  it("selects different weeks from footer bar and updates Trajectory HUD", () => {
    render(<ProgressClient />);

    // Click 'Tuần 3' in the trajectory footer bar
    const week3Btn = screen.getByRole("button", { name: /Tuần 3/ });
    fireEvent.click(week3Btn);

    // Mini HUD should show note for Tuần 3
    expect(screen.getByText("Vượt qua Milestone Test 1")).toBeInTheDocument();
    expect(screen.getAllByText("Tuần 3").length).toBeGreaterThanOrEqual(1);
  });

  it("opens, performs, and completes AI Speaking Pronunciation drill modal", () => {
    render(<ProgressClient />);

    // Open pronunciation drill
    const openDrillBtn = screen.getByText(
      /Khắc phục ngay: Luyện phát âm nguyên âm đôi/
    );
    fireEvent.click(openDrillBtn);

    // Modal should be visible
    const modal = screen.getByRole("dialog");
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText("unforgettable")).toBeInTheDocument();
    expect(
      within(modal).getByText("/ˌʌn.fəˈɡet.ə.bəl/ — Chú ý âm chuyển tiếp")
    ).toBeInTheDocument();

    // Complete drill
    const completeBtn = screen.getByRole("button", {
      name: "Hoàn thành bài tập (+0.2 Speaking)",
    });
    fireEvent.click(completeBtn);

    // Modal should close and toast should appear
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Speaking Part 2 Boost")).toBeInTheDocument();
  });

  it("toggles 3D heatmap isometric elevation mode", () => {
    render(<ProgressClient />);

    const toggleBtn = screen.getByRole("button", {
      name: "Bật tắt khối nổi 3D Heatmap",
    });
    expect(toggleBtn).toHaveTextContent("Khối nổi 3D: Tắt");

    // Click toggle to enable 3D
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveTextContent("Khối nổi 3D: Bật");

    // Click toggle to disable 3D
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveTextContent("Khối nổi 3D: Tắt");
  });

  it("navigates to vocabulary vault on 'Ôn tập' click", () => {
    render(<ProgressClient />);

    const reviewBtn = screen.getByRole("button", { name: "Ôn tập từ vựng" });
    fireEvent.click(reviewBtn);

    expect(mockPush).toHaveBeenCalledWith("/learn/vocabulary");
  });

  it("opens PDF export modal and calls window.print on confirmation", () => {
    render(<ProgressClient />);

    // Click Export PDF
    const exportBtn = screen.getByRole("button", { name: "Xuất báo cáo PDF" });
    fireEvent.click(exportBtn);

    // Verify modal
    const modal = screen.getByRole("dialog");
    expect(modal).toBeInTheDocument();
    expect(
      within(modal).getByText("Xuất báo cáo tiến độ học tập")
    ).toBeInTheDocument();

    // Click Print
    const printBtn = screen.getByRole("button", { name: "In / Lưu file PDF" });
    fireEvent.click(printBtn);

    expect(window.print).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
