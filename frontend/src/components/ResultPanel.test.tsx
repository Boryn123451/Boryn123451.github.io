import { fireEvent, render, screen } from "@testing-library/react";

import { ResultPanel } from "./ResultPanel";

const result = {
  operation: "evaluate",
  inputLatex: "5 \\cdot \\sqrt{9}",
  resultLatex: "15",
  resultPlain: "15",
  warnings: [],
};

describe("ResultPanel", () => {
  it("renders the main value as LaTeX first and reveals plain text", () => {
    const { container } = render(<ResultPanel result={result} error={null} />);

    expect(screen.getByRole("heading", { name: "Wynik" })).toBeInTheDocument();
    expect(screen.getByText("Wejście")).toBeInTheDocument();
    expect(container.querySelectorAll(".katex").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Pokaż zapis tekstowy" }));
    expect(screen.getByText("Zapis tekstowy")).toBeInTheDocument();
    expect(screen.getAllByText("15").length).toBeGreaterThan(0);
  });

  it("shows a placeholder when no result is available", () => {
    render(<ResultPanel result={null} error={null} />);

    expect(screen.getByText(/Po wykonaniu obliczenia wynik pojawi się tutaj/i)).toBeInTheDocument();
  });
});
