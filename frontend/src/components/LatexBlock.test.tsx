import { render, screen } from "@testing-library/react";

import { LatexBlock } from "./LatexBlock";

describe("LatexBlock", () => {
  it("renders visible markup for a simple numeric expression", () => {
    const { container } = render(<LatexBlock latex="15" />);

    expect(container.querySelector(".katex")).not.toBeNull();
    expect(container.textContent).toContain("15");
  });

  it("falls back to empty-state text when latex is missing", () => {
    render(<LatexBlock latex="" />);

    expect(screen.getByText("Brak danych")).toBeInTheDocument();
  });
});
