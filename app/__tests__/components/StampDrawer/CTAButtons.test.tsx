import { vi, describe, it, expect } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CTAButtons } from "../../../components/StampDrawer/components/CTAButtons";

const defaultProps = {
  platformSpec: {
    name: "Test Platform",
  },
  verificationState: {
    isVerified: false,
    isLoading: false,
  },
  onVerify: vi.fn(),
  onClose: vi.fn(),
};

describe("CTAButtons", () => {
  it("should render verify button when not verified", () => {
    render(<CTAButtons {...defaultProps} />);
    expect(screen.getByText("Check Eligibility")).toBeInTheDocument();
  });

  it("should render close button when verified", () => {
    render(<CTAButtons {...defaultProps} verificationState={{ isVerified: true, isLoading: false }} />);
    expect(screen.getByText("Close")).toBeInTheDocument();
  });

  it("should show loading state", () => {
    render(<CTAButtons {...defaultProps} verificationState={{ isVerified: false, isLoading: true }} />);
    expect(screen.getByText("Verifying...")).toBeInTheDocument();
  });

  it("should call onVerify when verify button clicked", () => {
    const onVerify = vi.fn();
    render(<CTAButtons {...defaultProps} onVerify={onVerify} />);

    fireEvent.click(screen.getByText("Check Eligibility"));
    expect(onVerify).toHaveBeenCalled();
  });

  it("should call onClose when close button clicked", () => {
    const onClose = vi.fn();
    render(
      <CTAButtons {...defaultProps} onClose={onClose} verificationState={{ isVerified: true, isLoading: false }} />
    );

    fireEvent.click(screen.getByText("Close"));
    expect(onClose).toHaveBeenCalled();
  });

  it("should render custom CTA with href", () => {
    render(
      <CTAButtons
        {...defaultProps}
        platformSpec={{
          name: "Test",
          cta: {
            label: "Visit Website",
            href: "https://example.com",
          },
        }}
      />
    );

    const link = screen.getByText("Visit Website").closest("a");
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("should render custom CTA with onClick", () => {
    const onClick = vi.fn();
    render(
      <CTAButtons
        {...defaultProps}
        platformSpec={{
          name: "Test",
          cta: {
            label: "Custom Action",
            onClick,
          },
        }}
      />
    );

    fireEvent.click(screen.getByText("Custom Action"));
    expect(onClick).toHaveBeenCalled();
  });

  it("should disable button when loading", () => {
    render(<CTAButtons {...defaultProps} verificationState={{ isVerified: false, isLoading: true }} />);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });
});
