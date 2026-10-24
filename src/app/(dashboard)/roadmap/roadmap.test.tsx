import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { RoadmapClient } from "./client";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("RoadmapClient component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
  });

  it("renders header, view switcher, and countdown correctly", () => {
    render(
      <RoadmapClient
        targetBand="6.5"
        currentBand="4.0"
        targetExamDate="2026-12-15"
        initialDailyMinutes={35}
      />
    );

    // Verify main title and target band
    expect(screen.getByText(/IELTS ACADEMIC 6.5/)).toBeInTheDocument();
    expect(screen.getByText("BẢN ĐỒ LỘ TRÌNH CÁ NHÂN HÓA")).toBeInTheDocument();

    // Verify 3 view tabs
    expect(
      screen.getByRole("button", { name: "Chuyển chế độ Bản đồ cây 3D" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Chuyển chế độ Danh sách" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Chuyển chế độ Lịch học" })
    ).toBeInTheDocument();

    // Verify countdown days and sidebar
    expect(screen.getByText("THỜI GIAN BIỂU")).toBeInTheDocument();
    expect(screen.getByText("ngày đến kỳ thi thật")).toBeInTheDocument();
    expect(screen.getByText("AI PACING ASSISTANT")).toBeInTheDocument();
    expect(screen.getByText("NĂNG LỰC KỸ NĂNG")).toBeInTheDocument();
  });

  it("switches between 3 views (3D, List, and Calendar) properly", () => {
    render(
      <RoadmapClient
        targetBand="6.5"
        currentBand="4.0"
        targetExamDate="2026-12-15"
        initialDailyMinutes={35}
      />
    );

    // 1. Switch to Danh Sách (List view)
    const listTabBtn = screen.getByRole("button", { name: "Chuyển chế độ Danh sách" });
    fireEvent.click(listTabBtn);

    // List view phases should appear
    expect(
      screen.getByText(/Phase 1: Nền tảng cơ bản \(A1 - A2\) • Hoàn thành 100%/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Phase 2: Pre-IELTS chiến thuật \(4.0 - 5.0\) • Đang học/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Phase 3: Bứt phá band điểm \(5.5 - 6.5\) • Đã khóa/)
    ).toBeInTheDocument();

    // 2. Switch to Lịch Học (Calendar view)
    const calTabBtn = screen.getByRole("button", { name: "Chuyển chế độ Lịch học" });
    fireEvent.click(calTabBtn);

    // Calendar view cards should appear
    expect(
      screen.getByText("Lịch phân bổ bài học theo tuần (Tháng 10 - 12/2026)")
    ).toBeInTheDocument();
    expect(screen.getByText(/Tuần trước • Đã xong/)).toBeInTheDocument();
    expect(screen.getByText(/Tuần này • Đang học/)).toBeInTheDocument();
    expect(screen.getByText(/Tuần tới • Dự kiến/)).toBeInTheDocument();

    // 3. Switch back to 3D Map
    const threeTabBtn = screen.getByRole("button", { name: "Chuyển chế độ Bản đồ cây 3D" });
    fireEvent.click(threeTabBtn);

    // List view should be unmounted
    expect(
      screen.queryByText(/Phase 1: Nền tảng cơ bản \(A1 - A2\) • Hoàn thành 100%/)
    ).not.toBeInTheDocument();
  });

  it("updates pacing simulator and finish date when dragging pacing slider", () => {
    render(
      <RoadmapClient
        targetBand="6.5"
        currentBand="4.0"
        targetExamDate="2026-12-15"
        initialDailyMinutes={35}
      />
    );

    // Verify initial pacing minutes
    expect(screen.getByText("35 phút/ngày")).toBeInTheDocument();

    // Drag slider to 60 minutes
    const slider = screen.getByRole("slider", {
      name: "Điều chỉnh thời gian học mỗi ngày",
    });
    fireEvent.change(slider, { target: { value: "60" } });

    // Verify updated pacing minutes
    expect(screen.getByText("60 phút/ngày")).toBeInTheDocument();
    expect(screen.getByText(/Tốc độ hiện tại:/)).toBeInTheDocument();
  });

  it("handles navigation from List View actions (Học tiếp and Test-out)", () => {
    render(
      <RoadmapClient
        targetBand="6.5"
        currentBand="4.0"
        targetExamDate="2026-12-15"
        initialDailyMinutes={35}
      />
    );

    // Switch to List view
    const listTabBtn = screen.getByRole("button", { name: "Chuyển chế độ Danh sách" });
    fireEvent.click(listTabBtn);

    // Click "Học tiếp: Unit 2 - Quá khứ đơn →"
    const continueBtn = screen.getByText("Học tiếp: Unit 2 - Quá khứ đơn →");
    fireEvent.click(continueBtn);
    expect(mockPush).toHaveBeenCalledWith("/learn");

    // Click "⚡ Làm bài vượt cấp (Test-out)"
    const testOutBtn = screen.getByText("⚡ Làm bài vượt cấp (Test-out)");
    fireEvent.click(testOutBtn);
    expect(mockPush).toHaveBeenCalledWith("/mock-tests");

    // Click "↻ Xem lại" for Vocabulary
    const reviewBtns = screen.getAllByText("↻ Xem lại");
    fireEvent.click(reviewBtns[0]);
    expect(mockPush).toHaveBeenCalledWith("/learn/vocabulary");
  });
});
