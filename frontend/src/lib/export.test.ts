import { normalizeLatexText } from "./export";

describe("normalizeLatexText", () => {
  it("upraszcza funkcje trygonometryczne do czytelnego zapisu tekstowego", () => {
    expect(normalizeLatexText("\\mathrm{sin}^{2}\\left(60\\right) + \\mathrm{cos}^{2}\\left(60\\right)"))
      .toBe("sin²(60) + cos²(60)");
  });

  it("zamienia typowe konstrukcje LaTeX na znaki unicode i czytelne funkcje", () => {
    expect(normalizeLatexText("\\frac{\\sqrt{3}}{2} \\cdot \\pi"))
      .toBe("(√(3))/(2) · π");
  });
});
