import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { PlansClient, STAGES } from "./client";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("PlansClient component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
  });

  it("renders hero section and default enrolled plan correctly", () => {
    render(<PlansClient initialBand={2.0} initialEnrolledId={1} />);

    // Verify main heading
    expect(screen.getByText("Lộ trình học tập chi tiết")).toBeInTheDocument();
    expect(screen.getByText("chuẩn khảo thí quốc tế")).toBeInTheDocument();

    // Verify active enrolled plan card
    const heroWidget = document.getElementById("cur");
    expect(heroWidget).toBeInTheDocument();
    if (heroWidget) {
      expect(within(heroWidget).getByText("Nền Tảng Ngữ Âm & Từ Vựng")).toBeInTheDocument();
      expect(within(heroWidget).getByText(/Tiến độ 40%/)).toBeInTheDocument();
    }

    // Verify 'Học tiếp' button triggers router.push("/learn")
    const continueBtn = screen.getByRole("button", { name: "Học tiếp lộ trình đang đăng ký" });
    fireEvent.click(continueBtn);
    expect(mockPush).toHaveBeenCalledWith("/learn");
  });

  it("renders all 6 stage cards and displays correct metadata", () => {
    render(<PlansClient initialBand={2.0} initialEnrolledId={1} />);

    // Verify stage cards
    expect(screen.getByText("Chặng 1: Nền Tảng Ngữ Âm & Ngữ Pháp Sơ Cấp")).toBeInTheDocument();
    expect(screen.getByText("Chặng 2: Mở Rộng Câu & Giao Tiếp Cơ Bản")).toBeInTheDocument();
    expect(screen.getByText("Chặng 3: Định Hình Tư Duy IELTS Nền Tảng")).toBeInTheDocument();
    expect(screen.getByText("Chặng 4: Chuẩn Hóa Kỹ Năng & Chiến Lược")).toBeInTheDocument();
    expect(screen.getByText("Chặng 5: Nâng Cao Biện Luận & Thuần Thục")).toBeInTheDocument();
    expect(screen.getByText("Chặng 6: Làm Chủ Bứt Phá & Tối Ưu Điểm")).toBeInTheDocument();

    // Verify badge for enrolled stage
    expect(screen.getByText("Lộ trình đang đăng ký")).toBeInTheDocument();
  });

  it("updates marker position and recommendation text when band slider changes", () => {
    render(<PlansClient initialBand={2.0} initialEnrolledId={1} />);

    // Initial marker
    expect(screen.getByText("Bạn ở đây · 2.0")).toBeInTheDocument();

    // Adjust band slider to 5.0
    const slider = screen.getByRole("slider", { name: "Điều chỉnh band hiện tại" });
    fireEvent.change(slider, { target: { value: "5.0" } });

    // Marker updates
    expect(screen.getByText("Bạn ở đây · 5.0")).toBeInTheDocument();
    // Recommendation should suggest stage 4
    expect(screen.getByText(/Gợi ý: bắt đầu từ/)).toBeInTheDocument();
  });

  it("filters cards when selecting tabs or typing in search box", () => {
    render(<PlansClient initialBand={2.0} initialEnrolledId={1} />);

    // Filter by tab Chặng 3
    const tabStage3 = screen.getByRole("tab", { name: /Chặng 3/ });
    fireEvent.click(tabStage3);

    // Chặng 3 card should be visible, Chặng 1 should be gone
    expect(screen.getByText("Chặng 3: Định Hình Tư Duy IELTS Nền Tảng")).toBeInTheDocument();
    expect(screen.queryByText("Chặng 1: Nền Tảng Ngữ Âm & Ngữ Pháp Sơ Cấp")).not.toBeInTheDocument();

    // Reset to Tất cả lộ trình
    const tabAll = screen.getByRole("tab", { name: "Tất cả lộ trình" });
    fireEvent.click(tabAll);

    // Search query
    const searchInput = screen.getByRole("searchbox", { name: "Tìm lộ trình" });
    fireEvent.change(searchInput, { target: { value: "Hedging" } });

    // Hedging is in Chặng 6
    expect(screen.getByText("Chặng 6: Làm Chủ Bứt Phá & Tối Ưu Điểm")).toBeInTheDocument();
    expect(screen.queryByText("Chặng 1: Nền Tảng Ngữ Âm & Ngữ Pháp Sơ Cấp")).not.toBeInTheDocument();

    // Search query with no match
    fireEvent.change(searchInput, { target: { value: "xyznonexistent" } });
    expect(screen.getByText("Không tìm thấy lộ trình nào")).toBeInTheDocument();
  });

  it("opens modal on 'Xem chi tiết', navigates prev/next, and enrolls in a new stage", () => {
    render(<PlansClient initialBand={2.0} initialEnrolledId={1} />);

    // Click "Xem chi tiết" for Chặng 2
    const viewDetailBtns = screen.getAllByText("Xem chi tiết");
    fireEvent.click(viewDetailBtns[1]); // Chặng 2

    // Modal dialog should be in document
    const modalDialog = screen.getByRole("dialog");
    expect(modalDialog).toBeInTheDocument();
    expect(within(modalDialog).getByText("Chặng 2: Mở Rộng Câu & Giao Tiếp Cơ Bản")).toBeInTheDocument();

    // Verify 4 stats
    expect(within(modalDialog).getByText("10 tuần")).toBeInTheDocument();
    expect(within(modalDialog).getByText("3.5 IELTS")).toBeInTheDocument();
    expect(within(modalDialog).getByText("60 phút")).toBeInTheDocument();

    // Verify link to full curriculum
    const deepLink = within(modalDialog).getByText(/Xem giáo trình chi tiết từng ngày/);
    expect(deepLink).toHaveAttribute("href", "/plans/stage-2-elementary");

    // Click 'Chặng sau' (›) to go to Chặng 3
    const nextBtn = screen.getByRole("button", { name: "Chặng sau" });
    fireEvent.click(nextBtn);
    expect(within(modalDialog).getByText("Chặng 3: Định Hình Tư Duy IELTS Nền Tảng")).toBeInTheDocument();

    // Enroll into Chặng 3 (mock window.confirm to return true)
    vi.spyOn(window, "confirm").mockImplementation(() => true);
    const enrollBtn = screen.getByRole("button", { name: "Đăng ký lộ trình này" });
    fireEvent.click(enrollBtn);

    // After enrolling, button in modal changes to "Đang học chặng này"
    expect(screen.getByRole("button", { name: "Đang học chặng này" })).toBeInTheDocument();

    // Close modal via '✕'
    const closeBtn = screen.getByRole("button", { name: "Đóng hộp thoại" });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
