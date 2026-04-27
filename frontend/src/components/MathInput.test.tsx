import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";

import type { Settings } from "../types";
import { MathInput } from "./MathInput";

const previewMathInput = vi.fn();

vi.mock("../api/client", () => ({
  previewMathInput: (...args: unknown[]) => previewMathInput(...args),
}));

const settings: Settings = {
  mode: "exact",
  angle_mode: "rad",
  fraction_display: "improper",
  solution_domain: "real",
  precision: 12,
};

describe("MathInput", () => {
  beforeEach(() => {
    previewMathInput.mockReset();
  });

  it("shows a friendly incomplete-input message instead of a hard syntax error", async () => {
    previewMathInput.mockResolvedValue({
      operation: "preview",
      status: "incomplete",
      latex: "8 /",
      plain: "8/",
      message: "Wyrażenie kończy się operatorem dzielenia.",
      suggestion: "Dopisz liczbę lub nawias po znaku '/'.",
      warnings: [],
    });

    function Harness() {
      const [value, setValue] = useState("");
      return <MathInput label="Wyrażenie" value={value} settings={settings} onChange={setValue} />;
    }

    render(<Harness />);

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "8/" },
    });

    await waitFor(() => {
      expect(previewMathInput).toHaveBeenCalled();
    });
    expect(await screen.findByText("Wpis jest jeszcze niepełny.")).toBeInTheDocument();
    expect(screen.getByText("Dopisz liczbę lub nawias po znaku '/'.")).toBeInTheDocument();
  }, 10000);
});
