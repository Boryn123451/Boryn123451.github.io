import { fireEvent, render, screen } from "@testing-library/react";

import { HistoryPanel } from "./HistoryPanel";

const longEntry = {
  id: "long-entry",
  operation: "solve",
  title: "Długi wynik",
  request: "x^4 - 1 = 0",
  reuseValue: "{-1, 1, -i, i}",
  resultLatex:
    "\\left\\{x_1 = \\frac{1 + \\sqrt{5}}{2}, x_2 = \\frac{1 - \\sqrt{5}}{2}, x_3 = \\frac{-1 + \\sqrt{5}}{2}, x_4 = \\frac{-1 - \\sqrt{5}}{2}, x_5 = \\frac{3 + \\sqrt{13}}{4}, x_6 = \\frac{3 - \\sqrt{13}}{4}\\right\\}",
  resultPlain:
    "{x1 = (1 + sqrt(5))/2, x2 = (1 - sqrt(5))/2, x3 = (-1 + sqrt(5))/2, x4 = (-1 - sqrt(5))/2, x5 = (3 + sqrt(13))/4, x6 = (3 - sqrt(13))/4}",
  createdAt: "2026-04-15T12:00:00.000Z",
};

describe("HistoryPanel", () => {
  it("zwija długie wyniki i pozwala je rozwinąć na żądanie", () => {
    render(
      <HistoryPanel
        entries={[longEntry]}
        onReuse={() => undefined}
        onApplyResult={() => undefined}
        onClear={() => undefined}
      />,
    );

    expect(screen.getByText("Skrót wyniku")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pokaż wynik" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Pokaż wynik" }));
    expect(screen.getByRole("button", { name: "Zwiń wynik" })).toBeInTheDocument();
    expect(document.querySelector(".katex")).not.toBeNull();
  });
});
