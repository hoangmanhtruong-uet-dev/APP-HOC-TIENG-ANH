import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LoadingState } from "@/components/shared/loading-state";
import { PageHeader } from "@/components/shared/page-header";

describe("remediation accessibility states", () => {
  it("announces real loading text once", () => {
    render(<LoadingState />);
    expect(screen.getByRole("status")).toHaveTextContent("Đang tải nội dung…");
  });

  it("allows very long page headings to wrap", () => {
    render(
      <PageHeader title={"x".repeat(300)} description={"y".repeat(300)} />,
    );
    expect(screen.getByRole("heading")).toHaveClass("break-words");
    expect(screen.getByRole("heading")).toHaveClass("[overflow-wrap:anywhere]");
  });
});
