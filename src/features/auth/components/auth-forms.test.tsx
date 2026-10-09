import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";
import { ProfileForm } from "@/features/profile/components/profile-form";

describe("authentication forms", () => {
  it("renders a labeled login form with correct autocomplete", () => {
    render(<LoginForm next="/profile" />);

    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "autocomplete",
      "email",
    );
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("toggles password visibility accessibly", () => {
    render(<LoginForm />);
    const password = screen.getByLabelText("Password");

    expect(password).toHaveAttribute("type", "password");
  });

  it("renders all required register fields", () => {
    render(<RegisterForm />);

    expect(screen.getByRole("checkbox")).toBeRequired();

    expect(screen.getByLabelText("Họ và tên")).toBeRequired();
    expect(screen.getByLabelText("Email")).toBeRequired();
    expect(screen.getByLabelText("Password")).toBeRequired();
    expect(screen.getByLabelText("Confirm password")).toBeRequired();
  });

  it("renders the persisted display name in the profile form", () => {
    render(<ProfileForm displayName="Nguyễn Minh Anh" />);

    expect(screen.getByLabelText("Họ và tên")).toHaveValue("Nguyễn Minh Anh");
    expect(screen.getByRole("button", { name: "Lưu hồ sơ" })).toBeEnabled();
  });
});
